export function describeCameraError(error) {
  const name = error?.name || '';
  const detail = String(error?.message || error || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Quyền camera đang bị chặn. Hãy cho phép camera trong cài đặt của trình duyệt.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || /could not start video source/i.test(detail)) {
    return 'Camera đang được ứng dụng hoặc thẻ trình duyệt khác sử dụng. Hãy đóng Camera, Teams, Zoom hoặc trang đang dùng webcam rồi thử lại.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'Không tìm thấy camera phù hợp trên thiết bị.';
  }
  if (name === 'AbortError') {
    return 'Camera bị gián đoạn khi khởi động. Hãy thử mở lại.';
  }
  return 'Không thể mở camera. Hãy kiểm tra quyền camera và thử lại.';
}

export async function getLocationName(latitude, longitude) {
  const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const cacheKey = `vinlab-location-v3-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

  function uniqueNames(values) {
    return values.filter((value, index, items) => value && items.indexOf(value) === index);
  }

  function prefixedAdministrativeName(item) {
    if (!item?.name) return '';
    const name = item.name.trim();
    if (/^(phường|xã|thị trấn|quận|huyện|thị xã|thành phố|tp\.?)/i.test(name)) return name;
    const description = String(item.description || '').toLocaleLowerCase('vi');
    if (description.includes('ward') || description.includes('phường')) return `phường ${name}`;
    if (description.includes('commune') || description.includes('xã')) return `xã ${name}`;
    if (description.includes('township') || description.includes('thị trấn')) return `thị trấn ${name}`;
    return name;
  }

  function cityName(value) {
    if (!value) return '';
    return /^(thành phố|tp\.?)/i.test(value) ? value : `TP. ${value}`;
  }

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'vi',
    });
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`);
    if (!response.ok) return fallback;

    const data = await response.json();
    const administrative = [...(data.localityInfo?.administrative || [])]
      .sort((left, right) => (right.adminLevel || 0) - (left.adminLevel || 0));
    const ward = administrative.find(item => {
      const description = String(item.description || '').toLocaleLowerCase('vi');
      return /ward|commune|township|phường|xã|thị trấn/.test(description);
    });
    const locality = data.locality || (data.localityInfo?.informative || [])
      .slice()
      .sort((left, right) => (right.order || 0) - (left.order || 0))
      .find(item => item.name)?.name;
    const municipality = data.city || data.principalSubdivision;
    const parts = uniqueNames([
      locality,
      ward && ward.name !== locality ? prefixedAdministrativeName(ward) : '',
      municipality && municipality !== locality && municipality !== ward?.name ? cityName(municipality) : '',
    ]);
    const locationName = parts.join(', ') || data.countryName || fallback;
    sessionStorage.setItem(cacheKey, locationName);
    return locationName;
  } catch {
    return fallback;
  }
}

export function getCaptureMetadata() {
  const capturedAt = new Date();
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(capturedAt);
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(capturedAt);
  const dateTime = `${time} · ${date}`;

  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ date, time, dateTime, location: 'Không có dữ liệu vị trí', accuracy: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords;
        const location = await getLocationName(latitude, longitude);
        resolve({
          date,
          time,
          dateTime,
          location,
          accuracy: Math.round(accuracy),
        });
      },
      () => resolve({ date, time, dateTime, location: 'Không có dữ liệu vị trí', accuracy: null }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

export function getCurrentCoordinates() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

export function captureLivenessFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

export function drawVideoFrame(canvas, video, mirror = false) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.save();
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.restore();
}

export function stampCaptureMetadata(canvas, metadata) {
  const context = canvas.getContext('2d');
  const scale = Math.max(1, canvas.width / 1280);
  const padding = Math.round(24 * scale);
  const bandHeight = Math.round(132 * scale);
  const y = canvas.height - bandHeight;

  const gradient = context.createLinearGradient(0, y, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(10, 18, 36, 0.20)');
  gradient.addColorStop(0.25, 'rgba(10, 18, 36, 0.78)');
  gradient.addColorStop(1, 'rgba(10, 18, 36, 0.96)');
  context.fillStyle = gradient;
  context.fillRect(0, y, canvas.width, bandHeight);

  context.fillStyle = '#1557b0';
  context.fillRect(0, y, Math.round(7 * scale), bandHeight);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#ffffff';
  context.font = `900 ${Math.round(34 * scale)}px Arial, sans-serif`;
  context.fillText(metadata.time, padding, y + Math.round(55 * scale));

  context.font = `700 ${Math.round(16 * scale)}px Arial, sans-serif`;
  context.fillStyle = '#fca5a5';
  context.fillText(metadata.date, padding, y + Math.round(85 * scale));

  context.fillStyle = '#ffffff';
  context.font = `700 ${Math.round(17 * scale)}px Arial, sans-serif`;
  const locationLabel = `GPS  ${metadata.location}`;
  context.fillText(locationLabel, padding, y + Math.round(113 * scale), canvas.width * 0.68);

  if (metadata.accuracy) {
    context.fillStyle = '#cbd5e1';
    context.font = `600 ${Math.round(13 * scale)}px Arial, sans-serif`;
    context.fillText(`Độ chính xác ±${metadata.accuracy}m`, canvas.width * 0.54, y + Math.round(113 * scale));
  }

  context.textAlign = 'right';
  context.fillStyle = '#ffffff';
  context.font = `900 ${Math.round(18 * scale)}px Arial, sans-serif`;
  context.fillText('VINLAB', canvas.width - padding, y + Math.round(55 * scale));
  context.fillStyle = '#fda4af';
  context.font = `700 ${Math.round(12 * scale)}px Arial, sans-serif`;
  context.fillText('SMART CHECK-IN', canvas.width - padding, y + Math.round(78 * scale));
  context.fillStyle = '#94a3b8';
  context.font = `600 ${Math.round(11 * scale)}px Arial, sans-serif`;
  context.fillText('Ảnh có dấu thời gian & vị trí', canvas.width - padding, y + Math.round(102 * scale));
}

export function canvasToJpegFile(canvas, filename) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(blob ? new File([blob], filename, { type: 'image/jpeg' }) : null);
    }, 'image/jpeg', 0.92);
  });
}
