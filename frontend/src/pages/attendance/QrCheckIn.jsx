import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, QrCode, ShieldCheck, Sparkles, Wifi } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../lib/api';
import { SectionHeading } from '../../components';
import { describeCameraError, getCaptureMetadata, drawVideoFrame, stampCaptureMetadata, canvasToJpegFile } from '../../lib/media';

function normalizeQrValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (value.toUpperCase().startsWith('VINLAB:')) return value.slice(value.indexOf(':') + 1).trim();
  if (value.startsWith('{')) {
    try {
      const payload = JSON.parse(value);
      return String(payload.qr_token || payload.token || '').trim();
    } catch {
      return value;
    }
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.searchParams.get('qr') || url.searchParams.get('qr_token') || url.searchParams.get('token') || value;
    } catch {
      return value;
    }
  }
  return value;
}

export function QrCheckIn({ registerCameraStop, currentUser }) {
  const [studentCode, setStudentCode] = useState(currentUser.student_code || 'SV001');
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState('');
  const [cameraStatus, setCameraStatus] = useState('Đang khởi động camera...');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [lastScannedValue, setLastScannedValue] = useState('');
  const [scanPreview, setScanPreview] = useState('');
  const qrScannerRef = useRef(null);
  const startupPromiseRef = useRef(null);
  const stopPromiseRef = useRef(null);
  const disposedRef = useRef(false);
  const mountedRef = useRef(false);
  const studentCodeRef = useRef(studentCode);

  useEffect(() => {
    studentCodeRef.current = studentCode;
  }, [studentCode]);

  async function doCheck(token) {
    const normalizedToken = normalizeQrValue(token);
    if (!normalizedToken) {
      setMessage('❌ Mã QR trống hoặc không đọc được.');
      return;
    }
    try {
      await api('/check-in', {
        method: 'POST',
        body: JSON.stringify({ student_code: studentCode, qr_token: normalizedToken }),
      });
      setMessage('✅ Điểm danh thành công');
    } catch (error) {
      const duplicate = error.message.toLocaleLowerCase('vi').includes('đã điểm danh');
      setMessage(duplicate ? `ℹ️ ${error.message}` : `❌ ${error.message}`);
    }
  }

  const stopQrCamera = useCallback(async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    disposedRef.current = true;
    stopPromiseRef.current = (async () => {
      try {
        await startupPromiseRef.current;
      } catch {
        // Camera startup errors are handled by startQrCamera.
      }
      const scanner = qrScannerRef.current;
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // The camera may already have been released by the browser.
      }
      try {
        scanner.clear();
      } catch {
        // The scanner element may already be unmounted.
      }
    })().finally(() => {
      stopPromiseRef.current = null;
    });
    return stopPromiseRef.current;
  }, []);

  async function startQrCamera(cameraId = selectedCameraId) {
    if (startupPromiseRef.current || qrScannerRef.current?.isScanning) return;
    disposedRef.current = false;
    setCameraStatus('Đang xin quyền sử dụng camera...');
    setCameraReady(false);
    setCameraFailed(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }
      const availableCameras = await Html5Qrcode.getCameras();
      if (disposedRef.current) return;
      if (!availableCameras.length) {
        const error = new Error('Không tìm thấy camera');
        error.name = 'NotFoundError';
        throw error;
      }
      setCameras(availableCameras);
      const rearCamera = availableCameras.find(camera =>
        /back|rear|environment|sau/i.test(camera.label || ''),
      );
      const preferredCameraId = cameraId || rearCamera?.id || '';
      const cameraConfig = preferredCameraId
        ? preferredCameraId
        : { facingMode: { ideal: 'environment' } };
      if (preferredCameraId) setSelectedCameraId(preferredCameraId);
      const scanner = qrScannerRef.current || new Html5Qrcode('qr-reader', false);
      qrScannerRef.current = scanner;
      const startupPromise = scanner.start(
        cameraConfig,
        {
          fps: 10,
          aspectRatio: 4 / 3,
          qrbox: (width, height) => {
            const size = Math.min(width, height, 320) * 0.82;
            return { width: size, height: size };
          },
        },
        async decodedText => {
          const normalizedToken = normalizeQrValue(decodedText);
          setLastScannedValue(decodedText);
          const video = document.querySelector('#qr-reader video');
          const evidenceCanvas = document.createElement('canvas');
          if (video?.videoWidth) drawVideoFrame(evidenceCanvas, video);
          await stopQrCamera();
          if (mountedRef.current) {
            setCameraReady(false);
            setCameraStatus('Đã đọc mã QR');
          }
          if (evidenceCanvas.width) {
            const metadata = await getCaptureMetadata();
            stampCaptureMetadata(evidenceCanvas, metadata);
            const evidenceFile = await canvasToJpegFile(evidenceCanvas, 'qr-checkin.jpg');
            if (evidenceFile && mountedRef.current) {
              setScanPreview(current => {
                if (current) URL.revokeObjectURL(current);
                return URL.createObjectURL(evidenceFile);
              });
            }
          }
          try {
            await api('/check-in', {
              method: 'POST',
              body: JSON.stringify({
                student_code: studentCodeRef.current,
                qr_token: normalizedToken,
              }),
            });
            if (mountedRef.current) setMessage('✅ Điểm danh thành công');
          } catch (error) {
            if (mountedRef.current) {
              const isInvalidQr = error.message.toLocaleLowerCase('vi').includes('qr không hợp lệ');
              const duplicate = error.message.toLocaleLowerCase('vi').includes('đã điểm danh');
              setMessage(duplicate
                ? `ℹ️ ${error.message}`
                : isInvalidQr
                  ? '❌ Mã vừa quét không phải QR điểm danh đang tồn tại trên hệ thống.'
                  : `❌ ${error.message}`);
              window.setTimeout(() => {
                if (!mountedRef.current) return;
                disposedRef.current = false;
                qrScannerRef.current = null;
                startQrCamera(selectedCameraId);
              }, 1200);
            }
          }
        },
        () => {},
      );
      startupPromiseRef.current = startupPromise;
      await startupPromise;
      startupPromiseRef.current = null;
      if (disposedRef.current) {
        await stopQrCamera();
        return;
      }
      if (!mountedRef.current) return;
      setCameraReady(true);
      setCameraFailed(false);
      setCameraStatus('Camera sẵn sàng');
    } catch (error) {
      startupPromiseRef.current = null;
      if (disposedRef.current || !mountedRef.current) return;
      setCameraReady(false);
      setCameraFailed(true);
      setCameraStatus('Không thể mở camera');
      setMessage(`❌ ${describeCameraError(error)}`);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    disposedRef.current = false;
    startQrCamera();
    return () => {
      mountedRef.current = false;
      stopQrCamera();
    };
  }, []);

  useEffect(() => registerCameraStop(stopQrCamera), [registerCameraStop, stopQrCamera]);

  useEffect(() => () => {
    if (scanPreview) URL.revokeObjectURL(scanPreview);
  }, [scanPreview]);

  async function changeCamera(cameraId) {
    setSelectedCameraId(cameraId);
    await stopQrCamera();
    disposedRef.current = false;
    qrScannerRef.current = null;
    await startQrCamera(cameraId);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="card scanner-card">
        <SectionHeading
          icon={QrCode}
          kicker="Quét bằng camera"
          title="Đưa mã QR vào khung"
          description="Hệ thống sẽ tự động nhận diện và xác nhận."
        />
        <label className="field-label mt-6 block">
          Mã sinh viên
          <input
            className="input mt-2"
            value={studentCode}
            onChange={e => setStudentCode(e.target.value)}
            placeholder="Ví dụ: SV001"
            disabled={currentUser.role === 'student'}
          />
        </label>
        <div className="scanner-shell mt-5">
          <div className={`scanner-status ${cameraReady ? '' : 'scanner-status-waiting'}`}>
            <Wifi size={14} />{cameraStatus}
          </div>
          <div id="qr-reader" />
          {cameraFailed && (
            <div className="scanner-retry">
              <Camera size={32} />
              <p>{cameraStatus}</p>
              <button type="button" onClick={startQrCamera}>Mở camera</button>
            </div>
          )}
        </div>
        {cameras.length > 1 && (
          <label className="field-label mt-4 block">
            Camera quét QR
            <select
              className="input mt-2"
              value={selectedCameraId}
              onChange={event => changeCamera(event.target.value)}
            >
              {cameras.map((camera, index) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {scanPreview && (
          <div className="capture-preview mt-4">
            <p>Ảnh ghi nhận khi quét mã</p>
            <img src={scanPreview} alt="Ảnh ghi nhận khi quét mã QR" />
          </div>
        )}
        {message && <div className="result-message mt-4">{message}</div>}
        {lastScannedValue && message.startsWith('❌') && (
          <div className="qr-debug-value mt-3">
            Nội dung camera vừa đọc: <code>{lastScannedValue}</code>
          </div>
        )}
      </section>

      <div className="space-y-5">
        <section className="card">
          <SectionHeading icon={ShieldCheck} kicker="Phương án dự phòng" title="Nhập mã xác nhận thủ công" />
          <p className="mt-4 text-sm leading-relaxed text-slate-500">Sử dụng khi thiết bị không cấp quyền camera hoặc mã QR khó quét.</p>
          <input className="input mt-5" value={manual} onChange={e => setManual(e.target.value)} placeholder="Dán mã xác nhận tại đây" />
          <button className="btn mt-3 w-full" type="button" onClick={() => doCheck(manual)}>
            Xác nhận điểm danh<ArrowRight size={18} />
          </button>
        </section>

        <section className="tip-card">
          <div className="tip-icon"><Sparkles size={20} /></div>
          <div>
            <p className="font-extrabold text-slate-900">Mẹo quét nhanh</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">Giữ điện thoại ổn định, đủ sáng và đặt mã QR cách camera khoảng 20 cm.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
