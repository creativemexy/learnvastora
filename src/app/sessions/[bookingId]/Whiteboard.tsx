import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

const SIGNAL_SERVER_URL = process.env.NEXT_PUBLIC_SIGNAL_URL || "http://localhost:4000";

const COLORS = ["#222", "#ff9800", "#2196f3", "#43a047", "#e53935"];

export default function Whiteboard({ roomId, visible, onClose }: { roomId: string, visible: boolean, onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState<'pen' | 'eraser'>("pen");
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!visible) return;
    const s = io(SIGNAL_SERVER_URL);
    setSocket(s);
    s.emit("join-whiteboard", roomId);
    s.on("draw", ({ x0, y0, x1, y1, color, tool }) => {
      drawLine(x0, y0, x1, y1, color, tool, false);
    });
    s.on("clear", () => {
      clearCanvas(false);
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
      // @ts-ignore
      x = e.clientX - rect.left;
      // @ts-ignore
      y = e.clientY - rect.top;
    }
    return { x, y };
  };

  let last = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    setDrawing(true);
    last.current = getCanvasCoords(e);
  };
  const handlePointerUp = () => {
    setDrawing(false);
    last.current = null;
  };
  const handlePointerMove = (e: any) => {
    if (!drawing) return;
    const curr = getCanvasCoords(e);
    if (last.current && curr) {
      drawLine(last.current.x, last.current.y, curr.x, curr.y, color, tool, true);
      last.current = curr;
    }
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, tool: string, emit: boolean) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = tool === "eraser" ? "#fff" : color;
    ctx.lineWidth = tool === "eraser" ? 16 : 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
    if (!emit || !socket) return;
    socket.emit("draw", { x0, y0, x1, y1, color, tool, roomId });
  };

  const clearCanvas = (emit = true) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (emit && socket) socket.emit("clear", { roomId });
  };

  useEffect(() => {
    if (!visible) return;
    clearCanvas(false);
  }, [visible]);

  return visible ? (
    <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex flex-column align-items-center justify-content-center" style={{ zIndex: 20 }}>
      <div className="d-flex gap-2 mb-2">
        <button className={`btn btn-sm ${tool === 'pen' ? 'btn-warning' : 'btn-light'}`} onClick={() => setTool('pen')}><i className="bi bi-pencil"></i></button>
        <button className={`btn btn-sm ${tool === 'eraser' ? 'btn-warning' : 'btn-light'}`} onClick={() => setTool('eraser')}><i className="bi bi-eraser"></i></button>
        {COLORS.map(c => (
          <button key={c} className="btn btn-sm" style={{ background: c, border: color === c ? '2px solid #ff9800' : '1px solid #ccc' }} onClick={() => setColor(c)}></button>
        ))}
        <button className="btn btn-sm btn-outline-danger" onClick={() => clearCanvas()}><i className="bi bi-trash"></i></button>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        style={{ border: '2px solid #eee', borderRadius: 8, background: '#fff', cursor: tool === 'eraser' ? 'crosshair' : 'pointer', maxWidth: '100%', maxHeight: '70vh' }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseOut={handlePointerUp}
        onMouseMove={handlePointerMove}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
        onTouchMove={handlePointerMove}
      />
    </div>
  ) : null;
} 