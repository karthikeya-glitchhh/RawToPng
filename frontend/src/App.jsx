import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Download, RefreshCw, X, AlertCircle, FileType, FileText, ChevronRight } from 'lucide-react';
import './App.css';

const tools = [
  { id: 'raw-to-png', name: 'RAW to PNG', icon: <ImageIcon size={20} />, description: 'Professional RAW frames' },
  { id: 'jpeg-to-png', name: 'JPEG to PNG', icon: <FileType size={20} />, description: 'Convert JPEG to PNG' },
  { id: 'png-to-jpeg', name: 'PNG to JPEG', icon: <FileType size={20} />, description: 'Convert PNG to JPEG' },
  { id: 'images-to-pdf', name: 'Images to PDF', icon: <FileText size={20} />, description: 'Merge images to PDF' },
];

function App() {
  const [activeTool, setActiveTool] = useState('raw-to-png');
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]); // For multi-file tools like PDF
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      if (activeTool === 'images-to-pdf') {
        setFiles(prev => [...prev, ...selectedFiles]);
      } else {
        setFile(selectedFiles[0]);
      }
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      if (activeTool === 'images-to-pdf') {
        setFiles(prev => [...prev, ...droppedFiles]);
      } else {
        setFile(droppedFiles[0]);
      }
      setPreview(null);
      setError(null);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (activeTool === 'images-to-pdf' ? files.length === 0 : !file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (activeTool === 'images-to-pdf') {
      files.forEach(f => formData.append('files', f));
    } else {
      formData.append('file', file);
    }

    let endpoint = 'http://localhost:8000/convert';
    if (activeTool === 'jpeg-to-png') endpoint += '/jpeg-to-png';
    else if (activeTool === 'png-to-jpeg') endpoint += '/png-to-jpeg';
    else if (activeTool === 'images-to-pdf') endpoint += '/images-to-pdf';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPreview(data.png_data || data.data);
        setFileName(data.filename || (activeTool === 'images-to-pdf' ? "converted.pdf" : "converted_image.png"));
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
    setFiles([]);
    setPreview(null);
    setError(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = preview;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const switchTool = (toolId) => {
    setActiveTool(toolId);
    reset();
  };

  const getAcceptTypes = () => {
    switch (activeTool) {
      case 'raw-to-png': return ".raw,.arw,.cr2,.nef,.dng,.orf,.sr2";
      case 'jpeg-to-png': return ".jpg,.jpeg";
      case 'png-to-jpeg': return ".png";
      case 'images-to-pdf': return ".jpg,.jpeg,.png";
      default: return "*";
    }
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
        <p className="subtitle">Professional image conversion with intelligent processing</p>
      </header>

      <main>
        <div className="main-content">
          {!preview ? (
            <div 
              className={`upload-card ${(file || files.length > 0) ? 'file-selected' : ''}`}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                style={{ display: 'none' }}
                accept={getAcceptTypes()}
                multiple={activeTool === 'images-to-pdf'}
              />
              
              <div className="upload-content">
                {(!file && files.length === 0) ? (
                  <>
                    <div className="icon-circle">
                      <Upload size={48} color="#a78bfa" />
                    </div>
                    <h2>Drop your {activeTool === 'images-to-pdf' ? 'images' : 'file'} here</h2>
                    <p>
                      {activeTool === 'raw-to-png' && "Supports .RAW, .ARW, .CR2, .NEF, .DNG and more"}
                      {activeTool === 'jpeg-to-png' && "Select JPEG/JPG images"}
                      {activeTool === 'png-to-jpeg' && "Select PNG images"}
                      {activeTool === 'images-to-pdf' && "Select multiple images to merge"}
                    </p>
                    <button className="select-btn" onClick={() => fileInputRef.current.click()}>
                      Select {activeTool === 'images-to-pdf' ? 'Files' : 'File'}
                    </button>
                  </>
                ) : (
                  <div className="selected-file-info">
                    {activeTool === 'images-to-pdf' ? (
                      <>
                        <div className="file-icon">
                          <FileType size={64} color="#8b5cf6" />
                        </div>
                        <h3>{files.length} images selected</h3>
                        <div className="file-list">
                          {files.map((f, i) => (
                            <div key={i} className="file-item">
                              <div className="file-item-info">
                                <ImageIcon size={16} />
                                <span>{f.name}</span>
                              </div>
                              <X size={16} className="remove-file" onClick={() => removeFile(i)} />
                            </div>
                          ))}
                        </div>
                        <button className="select-btn" style={{ marginBottom: '1rem' }} onClick={() => fileInputRef.current.click()}>
                          Add More
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="file-icon">
                          <FileType size={64} color="#8b5cf6" />
                        </div>
                        <h3>{file.name}</h3>
                        <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </>
                    )}

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
                            Convert to {activeTool === 'raw-to-png' || activeTool === 'jpeg-to-png' ? 'PNG' : activeTool === 'png-to-jpeg' ? 'JPEG' : 'PDF'}
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
                  <button className="download-btn" onClick={downloadFile}>
                    <Download size={20} />
                    Download {activeTool === 'images-to-pdf' ? 'PDF' : fileName.split('.').pop().toUpperCase()}
                  </button>
                  <button className="reset-btn" onClick={reset}>
                    <X size={20} />
                    New Image
                  </button>
                </div>
              </div>
              
              <div className="image-container">
                {activeTool === 'images-to-pdf' ? (
                  <div className="pdf-preview-box">
                    <FileText size={100} color="#8b5cf6" />
                    <p>PDF Document Ready</p>
                  </div>
                ) : (
                  <img src={preview} alt="Converted Preview" />
                )}
              </div>
              
              <div className="file-details">
                <span><strong>Filename:</strong> {fileName}</span>
                <span><strong>Format:</strong> {activeTool === 'images-to-pdf' ? 'PDF' : fileName.split('.').pop().toUpperCase()}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <h2 className="sidebar-title">Conversion Tools</h2>
          {tools.map(tool => (
            <button 
              key={tool.id} 
              className={`tool-card ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => switchTool(tool.id)}
            >
              <div className="tool-icon">
                {tool.icon}
              </div>
              <div className="tool-info">
                <span className="tool-name">{tool.name}</span>
                <span className="tool-desc">{tool.description}</span>
              </div>
              <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </button>
          ))}
        </aside>
      </main>

      <footer>
        <p>© 2026 RawSnap Engine • Professional Image Tools</p>
      </footer>
    </div>
  );
}

export default App;
