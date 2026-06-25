import React, { useCallback, useRef, useState } from 'react';
import { Activity, QrCode, ScanFace } from 'lucide-react';
import { QrCheckIn } from './QrCheckIn';
import { FaceDetect } from './FaceDetect';

export function CheckIn({ currentUser }) {
  const [method, setMethod] = useState('qr');
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const stopActiveCameraRef = useRef(async () => {});

  const registerCameraStop = useCallback(stopCamera => {
    stopActiveCameraRef.current = stopCamera;
    return () => {
      if (stopActiveCameraRef.current === stopCamera) {
        stopActiveCameraRef.current = async () => {};
      }
    };
  }, []);

  async function switchMethod(nextMethod) {
    if (nextMethod === method || switchingCamera) return;
    setSwitchingCamera(true);
    try {
      await stopActiveCameraRef.current();
      setMethod(nextMethod);
    } finally {
      setSwitchingCamera(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="checkin-methods">
        <button
          type="button"
          className={`checkin-method ${method === 'qr' ? 'checkin-method-active' : ''}`}
          onClick={() => switchMethod('qr')}
          disabled={switchingCamera}
        >
          <span><QrCode size={21} /></span>
          <div>
            <strong>Quét mã QR</strong>
            <small>Điểm danh bằng mã của buổi học</small>
          </div>
        </button>
        {currentUser.role === 'student' && (
          <button
            type="button"
            className={`checkin-method ${method === 'face' ? 'checkin-method-active' : ''}`}
            onClick={() => switchMethod('face')}
            disabled={switchingCamera}
          >
            <span><ScanFace size={21} /></span>
            <div>
              <strong>Quét khuôn mặt</strong>
              <small>Chụp và gửi ảnh xác thực</small>
            </div>
          </button>
        )}
      </div>
      {switchingCamera && <div className="camera-switching"><Activity size={20} />Đang chuyển camera...</div>}
      {method === 'qr'
        ? <QrCheckIn registerCameraStop={registerCameraStop} currentUser={currentUser} />
        : <FaceDetect registerCameraStop={registerCameraStop} currentUser={currentUser} />}
    </div>
  );
}
