from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import rawpy
from PIL import Image, ImageDraw
import io
import base64
import traceback
import sys
import tempfile
import os
import imageio
import numpy as np
import cv2
from typing import List

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_info_image(message):
    img = Image.new('RGB', (800, 400), color=(30, 41, 59))
    draw = ImageDraw.Draw(img)
    draw.text((400, 200), message, fill=(248, 250, 252), anchor="mm", align="center")
    return img

def normalize_arr(arr):
    """Normalizes array to 0-255 range for display."""
    amin, amax = arr.min(), arr.max()
    if amax == amin:
        return np.zeros_like(arr, dtype=np.uint8)
    return ((arr.astype(np.float32) - amin) * 255 / (amax - amin)).astype(np.uint8)

def demosaic_bayer(arr, pattern=cv2.COLOR_BayerRG2RGB):
    """Converts a Bayer array to RGB."""
    # OpenCV's demosaicing needs uint8 or uint16
    # If it's uint16, it works but output is uint16
    rgb = cv2.cvtColor(arr, pattern)
    return normalize_arr(rgb)

@app.post("/convert")
async def convert_raw_to_png(file: UploadFile = File(...)):
    file_ext = "." + file.filename.split(".")[-1].lower()
    img = None
    
    try:
        content = await file.read()
        file_size = len(content)
        print(f"--- PROCESSING: {file.filename} ({file_size} bytes) ---")
        
        # 1. Try standard rawpy first
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            try:
                with rawpy.imread(temp_file_path) as raw:
                    print("DEBUG: rawpy success")
                    rgb = raw.postprocess()
                    img = Image.fromarray(rgb)
            finally:
                if os.path.exists(temp_file_path): os.remove(temp_file_path)
        except: pass
        
        # 2. Try Fallbacks
        if img is None:
            try:
                img = Image.open(io.BytesIO(content))
                print("DEBUG: PIL success")
            except:
                try:
                    img_arr = imageio.imread(io.BytesIO(content))
                    img = Image.fromarray(img_arr)
                    print("DEBUG: imageio success")
                except: pass

        # 3. Specific Multi-Channel / Bayer Recomposition
        if img is None:
            w, h = None, None
            if file_size == 10056960:
                w, h = 2592, 1940
            elif file_size == 1848960:
                w, h = 1284, 720
            
            if w and h:
                arr = np.frombuffer(content, dtype=np.uint16).reshape((h, w))
                # Try demosaicing (assuming RGGB pattern)
                try:
                    # Most common bayer patterns: RG, BG, GR, GB
                    # Let's try COLOR_BayerBG2RGB as it's common for many sensors
                    rgb_arr = demosaic_bayer(arr, cv2.COLOR_BayerBG2RGB)
                    img = Image.fromarray(rgb_arr)
                    print(f"DEBUG: Demosaic success for {w}x{h}")
                except Exception as de:
                    print(f"DEBUG: Demosaic failed: {de}, falling back to grayscale")
                    img = Image.fromarray(normalize_arr(arr))

        if img is None:
            img = create_info_image("Decoding Failed.\nPlease check file.")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return JSONResponse(content={
            "png_data": f"data:image/png;base64,{img_str}",
            "filename": file.filename.replace(file_ext, ".png")
        })
        
    except Exception as e:
        print(f"CRITICAL: {e}")
        traceback.print_exc()
        buffer = io.BytesIO()
        create_info_image(f"Error: {str(e)[:50]}").save(buffer, format="PNG")
        return JSONResponse(content={"png_data": f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}", "filename": "error.png"})

@app.post("/convert/jpeg-to-png")
async def jpeg_to_png(file: UploadFile = File(...)):
    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content))
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return JSONResponse(content={
            "data": f"data:image/png;base64,{img_str}",
            "filename": file.filename.rsplit(".", 1)[0] + ".png"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/convert/png-to-jpeg")
async def png_to_jpeg(file: UploadFile = File(...)):
    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content))
        # Handle transparency
        if img.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
            
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=95)
        img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return JSONResponse(content={
            "data": f"data:image/jpeg;base64,{img_str}",
            "filename": file.filename.rsplit(".", 1)[0] + ".jpg"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/convert/images-to-pdf")
async def images_to_pdf(files: List[UploadFile] = File(...)):
    try:
        images = []
        for file in files:
            content = await file.read()
            img = Image.open(io.BytesIO(content))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
        
        if not images:
            raise HTTPException(status_code=400, detail="No images uploaded")
            
        buffer = io.BytesIO()
        images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
        pdf_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return JSONResponse(content={
            "data": f"data:application/pdf;base64,{pdf_str}",
            "filename": "converted_images.pdf"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
