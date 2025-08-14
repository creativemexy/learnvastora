import React, { useRef, useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import { Button, Form, InputGroup, Dropdown } from 'react-bootstrap';

const SIGNAL_SERVER_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || "http://localhost:4000";

const COLORS = [
  "#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", 
  "#ff00ff", "#00ffff", "#ffa500", "#800080", "#008000"
];

const BRUSH_SIZES = [1, 2, 3, 5, 8, 12, 16, 20];

interface WhiteboardProps {
  roomId: string;
  visible: boolean;
  onClose: () => void;
  mode: 'drawing' | 'text' | 'shapes' | 'select';
  color: string;
  brushSize: number;
  shape: 'rectangle' | 'circle' | 'line' | 'arrow';
  text: string;
  fontSize: number;
  collaborators: Array<{id: string, name: string, color: string}>;
  permissions: 'all' | 'host-only' | 'view-only';
  isHost: boolean;
  onModeChange: (mode: 'drawing' | 'text' | 'shapes' | 'select') => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onShapeChange: (shape: 'rectangle' | 'circle' | 'line' | 'arrow') => void;
  onTextChange: (text: string) => void;
  onFontSizeChange: (size: number) => void;
  onPermissionsChange: (permissions: 'all' | 'host-only' | 'view-only') => void;
  onExport: () => void;
  onSave: () => void;
}

interface DrawingAction {
  type: 'draw' | 'text' | 'shape' | 'clear';
  data: any;
  timestamp: number;
}

export default function Whiteboard({
  roomId,
  visible,
  onClose,
  mode,
  color,
  brushSize,
  shape,
  text,
  fontSize,
  collaborators,
  permissions,
  isHost,
  onModeChange,
  onColorChange,
  onBrushSizeChange,
  onShapeChange,
  onTextChange,
  onFontSizeChange,
  onPermissionsChange,
  onExport,
  onSave
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);

  useEffect(() => {
    if (!visible) return;
    
    const s = io(SIGNAL_SERVER_URL);
    setSocket(s);
    
    s.emit("join-whiteboard", { roomId });
    
    s.on("whiteboard-draw", ({ x0, y0, x1, y1, color, brushSize, tool }) => {
      drawLine(x0, y0, x1, y1, color, brushSize, tool, false);
    });
    
    s.on("whiteboard-clear", () => {
      clearCanvas(false);
    });
    
    s.on("whiteboard-text", ({ x, y, text, fontSize, color }) => {
      drawText(x, y, text, fontSize, color, false);
    });
    
    s.on("whiteboard-shape", ({ type, startX, startY, endX, endY, color, brushSize }) => {
      drawShape(type, startX, startY, endX, endY, color, brushSize, false);
    });
    
    s.on("whiteboard-undo", () => {
      undo(false);
    });
    
    s.on("whiteboard-redo", () => {
      redo(false);
    });
    
    return () => {
      s.disconnect();
    };
  }, [roomId, visible]);

  const getCanvasCoords = (e: React.MouseEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e instanceof TouchEvent) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as MouseEvent).clientX - rect.left;
      y = (e as MouseEvent).clientY - rect.top;
    }
    return { x, y };
  };

  const canEdit = permissions === 'all' || (permissions === 'host-only' && isHost);

  const handlePointerDown = (e: any) => {
    if (!canEdit) return;
    
    const coords = getCanvasCoords(e);
    setDrawing(true);
    setStartPoint(coords);
    
    if (mode === 'text') {
      setTextPosition(coords);
      setShowTextInput(true);
    }
  };

  const handlePointerUp = () => {
    if (!canEdit) return;
    
    setDrawing(false);
    setStartPoint(null);
  };

  const handlePointerMove = (e: any) => {
    if (!canEdit || !drawing || !startPoint) return;
    
    const coords = getCanvasCoords(e);
    
    if (mode === 'drawing') {
      drawLine(startPoint.x, startPoint.y, coords.x, coords.y, color, brushSize, 'pen', true);
      setStartPoint(coords);
    } else if (mode === 'shapes') {
      // Preview shape while dragging
      redrawCanvas();
      drawShape(shape, startPoint.x, startPoint.y, coords.x, coords.y, color, brushSize, false);
    }
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, brushSize: number, tool: string, emit: boolean) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = tool === "eraser" ? "#fff" : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
    
    if (emit && socket) {
      socket.emit("whiteboard-draw", { x0, y0, x1, y1, color, brushSize, tool, roomId });
      addToHistory({ type: 'draw', data: { x0, y0, x1, y1, color, brushSize, tool }, timestamp: Date.now() });
    }
  };

  const drawText = (x: number, y: number, text: string, fontSize: number, color: string, emit: boolean) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    
    if (emit && socket) {
      socket.emit("whiteboard-text", { x, y, text, fontSize, color, roomId });
      addToHistory({ type: 'text', data: { x, y, text, fontSize, color }, timestamp: Date.now() });
    }
  };

  const drawShape = (type: string, startX: number, startY: number, endX: number, endY: number, color: string, brushSize: number, emit: boolean) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.fillStyle = color;
    
    const width = endX - startX;
    const height = endY - startY;
    
    switch (type) {
      case 'rectangle':
        ctx.strokeRect(startX, startY, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(width * width + height * height);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        break;
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 20;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle - Math.PI / 6), endY - arrowLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle + Math.PI / 6), endY - arrowLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
    }
    
    if (emit && socket) {
      socket.emit("whiteboard-shape", { type, startX, startY, endX, endY, color, brushSize, roomId });
      addToHistory({ type: 'shape', data: { type, startX, startY, endX, endY, color, brushSize }, timestamp: Date.now() });
    }
  };

  const clearCanvas = (emit = true) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (emit && socket) {
      socket.emit("whiteboard-clear", { roomId });
      addToHistory({ type: 'clear', data: {}, timestamp: Date.now() });
    }
  };

  const addToHistory = (action: DrawingAction) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(action);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = (emit = true) => {
    if (historyIndex >= 0) {
      setHistoryIndex(prev => prev - 1);
      redrawCanvas();
      
      if (emit && socket) {
        socket.emit("whiteboard-undo", { roomId });
      }
    }
  };

  const redo = (emit = true) => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      redrawCanvas();
      
      if (emit && socket) {
        socket.emit("whiteboard-redo", { roomId });
      }
    }
  };

  const redrawCanvas = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Redraw all actions up to current index
    for (let i = 0; i <= historyIndex; i++) {
      const action = history[i];
      switch (action.type) {
        case 'draw':
          drawLine(action.data.x0, action.data.y0, action.data.x1, action.data.y1, action.data.color, action.data.brushSize, action.data.tool, false);
          break;
        case 'text':
          drawText(action.data.x, action.data.y, action.data.text, action.data.fontSize, action.data.color, false);
          break;
        case 'shape':
          drawShape(action.data.type, action.data.startX, action.data.startY, action.data.endX, action.data.endY, action.data.color, action.data.brushSize, false);
          break;
      }
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && textPosition) {
      drawText(textPosition.x, textPosition.y, textInput, fontSize, color, true);
      setTextInput('');
      setTextPosition(null);
      setShowTextInput(false);
    }
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current!;
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current!;
    const dataURL = canvas.toDataURL();
    localStorage.setItem(`whiteboard-${roomId}`, dataURL);
    alert('Whiteboard saved locally!');
  };

  useEffect(() => {
    if (!visible) return;
    clearCanvas(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="whiteboard-overlay">
      <div className="whiteboard-container">
        <div className="whiteboard-header">
          <div className="whiteboard-title">
            <i className="bi bi-pencil-square me-2"></i>
            Collaborative Whiteboard
            {collaborators.length > 0 && (
              <span className="whiteboard-collaborators-badge">
                {collaborators.length} active
              </span>
            )}
          </div>
          <div className="whiteboard-controls">
            {canEdit && (
              <>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => undo()}
                  disabled={historyIndex < 0}
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => redo()}
                  disabled={historyIndex >= history.length - 1}
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </Button>
              </>
            )}
            <Button variant="outline-primary" size="sm" onClick={exportCanvas}>
              <i className="bi bi-download"></i>
            </Button>
            <Button variant="outline-success" size="sm" onClick={saveCanvas}>
              <i className="bi bi-save"></i>
            </Button>
            <Button variant="outline-danger" size="sm" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </Button>
          </div>
        </div>

        <div className="whiteboard-toolbar">
          <div className="toolbar-section">
            <Button
              variant={mode === 'drawing' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => onModeChange('drawing')}
              disabled={!canEdit}
            >
              <i className="bi bi-pencil"></i>
            </Button>
            <Button
              variant={mode === 'text' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => onModeChange('text')}
              disabled={!canEdit}
            >
              <i className="bi bi-type"></i>
            </Button>
            <Button
              variant={mode === 'shapes' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => onModeChange('shapes')}
              disabled={!canEdit}
            >
              <i className="bi bi-shapes"></i>
            </Button>
            <Button
              variant={mode === 'select' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => onModeChange('select')}
              disabled={!canEdit}
            >
              <i className="bi bi-cursor"></i>
            </Button>
          </div>

          {mode === 'shapes' && (
            <div className="toolbar-section">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-shapes"></i> {shape}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => onShapeChange('rectangle')}>Rectangle</Dropdown.Item>
                  <Dropdown.Item onClick={() => onShapeChange('circle')}>Circle</Dropdown.Item>
                  <Dropdown.Item onClick={() => onShapeChange('line')}>Line</Dropdown.Item>
                  <Dropdown.Item onClick={() => onShapeChange('arrow')}>Arrow</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}

          <div className="toolbar-section">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <div className="color-preview" style={{ backgroundColor: color }}></div>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <div className="color-palette">
        {COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-option ${color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => onColorChange(c)}
                    ></div>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <div className="toolbar-section">
            <Form.Control
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="brush-size-slider"
              disabled={!canEdit}
            />
            <span className="brush-size-label">{brushSize}px</span>
          </div>

          {isHost && (
            <div className="toolbar-section">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-shield"></i> {permissions}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => onPermissionsChange('all')}>All can edit</Dropdown.Item>
                  <Dropdown.Item onClick={() => onPermissionsChange('host-only')}>Host only</Dropdown.Item>
                  <Dropdown.Item onClick={() => onPermissionsChange('view-only')}>View only</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}
      </div>

        <div className="whiteboard-canvas-container">
      <canvas
        ref={canvasRef}
            width={1200}
            height={800}
            className="whiteboard-canvas"
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseOut={handlePointerUp}
        onMouseMove={handlePointerMove}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
        onTouchMove={handlePointerMove}
      />
          
          {showTextInput && textPosition && (
            <div
              className="text-input-overlay"
              style={{
                position: 'absolute',
                left: textPosition.x,
                top: textPosition.y - fontSize,
                zIndex: 1000
              }}
            >
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  autoFocus
                />
                <Button variant="outline-primary" onClick={handleTextSubmit}>
                  <i className="bi bi-check"></i>
                </Button>
                <Button variant="outline-secondary" onClick={() => setShowTextInput(false)}>
                  <i className="bi bi-x"></i>
                </Button>
              </InputGroup>
            </div>
          )}
        </div>

        {collaborators.length > 0 && (
          <div className="whiteboard-collaborators">
            <div className="collaborators-title">Active Collaborators:</div>
            <div className="collaborators-list">
              {collaborators.map(collaborator => (
                <div key={collaborator.id} className="collaborator-item">
                  <div className="collaborator-avatar" style={{ backgroundColor: collaborator.color }}>
                    <i className="bi bi-person"></i>
                  </div>
                  <span className="collaborator-name">{collaborator.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 