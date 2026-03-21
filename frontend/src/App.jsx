import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Download, RefreshCw, X, AlertCircle, FileType } from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setError(null);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreview(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPreview(data.png_data);
        setFileName(data.filename || "converted_image.png");
      } else {
        setError(data.detail || "Conversion failed. Please try again.");
      }
    } catch (err) {
      setError("Unable to connect to the backend server. Make sure it's running.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = preview;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <div className="background-glow"></div>
      
      <header>
        <div className="logo">
          <div className="logo-icon">
            <ImageIcon size={32} color="#8b5cf6" />
          </div>
          <h1>Raw<span>Snap</span></h1>
        </div>
        <p className="subtitle">Professional RAW to PNG converter with intelligent auto-detection</p>
      </header>

      <main>
        {!preview ? (
          <div 
            className={`upload-card ${file ? 'file-selected' : ''}`}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              style={{ display: 'none' }}
              accept=".raw,.arw,.cr2,.nef,.dng,.orf,.sr2"
            />
            
            <div className="upload-content">
              {!file ? (
                <>
                  <div className="icon-circle">
                    <Upload size={48} color="#a78bfa" />
                  </div>
                  <h2>Drop your RAW file here</h2>
                  <p>Supports .RAW, .ARW, .CR2, .NEF, .DNG and more</p>
                  <button className="select-btn" onClick={() => fileInputRef.current.click()}>
                    Select File
                  </button>
                </>
              ) : (
                <div className="selected-file-info">
                  <div className="file-icon">
                    <FileType size={64} color="#8b5cf6" />
                  </div>
                  <h3>{file.name}</h3>
                  <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                  <div className="action-buttons">
                    <button className="convert-btn" onClick={handleConvert} disabled={loading}>
                      {loading ? (
                        <>
                          <RefreshCw className="spin" size={20} />
                          Converting...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={20} />
                          Convert to PNG
                        </>
                      )}
                    </button>
                    <button className="clear-btn" onClick={reset} disabled={loading}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="preview-card">
            <div className="preview-header">
              <h3>Conversion Successful</h3>
              <div className="preview-actions">
                <button className="download-btn" onClick={downloadImage}>
                  <Download size={20} />
                  Download PNG
                </button>
                <button className="reset-btn" onClick={reset}>
                  <X size={20} />
                  New Image
                </button>
              </div>
            </div>
            
            <div className="image-container">
              <img src={preview} alt="Converted Preview" />
            </div>
            
            <div className="file-details">
              <span><strong>Filename:</strong> {fileName}</span>
              <span><strong>Format:</strong> PNG</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}
      </main>

      <footer>
        <p>© 2026 RawSnap Engine • Built with React & Python</p>
      </footer>
    </div>
  );
}

export default App;
