import React, { useCallback, useEffect, useRef, useState } from 'react';

import { BookOpen, Trash2, Upload } from 'lucide-react';

import { api, API, authHeaders } from '../lib/api';

import { lessonCatalog } from '../config/appConfig';

import { SectionHeading } from './SectionHeading';

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LessonSlideManager({ compact = false }) {
  const [slides, setSlides] = useState([]);
  const [lessonId, setLessonId] = useState('4');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  async function loadSlides() {
    try {
      setSlides(await api('/lessons/slides'));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  useEffect(() => {
    loadSlides();
  }, []);

  function selectSlideFile(event) {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      event.target.value = '';
      setMessage('❌ Chỉ chấp nhận file có định dạng PDF.');
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      setFile(null);
      event.target.value = '';
      setMessage('❌ File PDF không được vượt quá 20 MB.');
      return;
    }
    setFile(selectedFile);
    setMessage('');
  }

  async function uploadSlide(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setMessage('❌ Hãy chọn một file PDF.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', lessonCatalog.find(item => String(item.id) === lessonId)?.title || '');
      const response = await fetch(`${API}/lessons/${lessonId}/slide`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Không thể tải slide lên');
      setFile(null);
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('✅ Đã lưu slide PDF cho bài học.');
      await loadSlides();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function previewSlide(targetLessonId) {
    const previewWindow = window.open('', '_blank');
    try {
      const response = await fetch(`${API}/lessons/${targetLessonId}/slide`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Không thể mở slide');
      }
      const url = URL.createObjectURL(await response.blob());
      if (previewWindow) previewWindow.location.href = url;
      else window.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      setMessage(`❌ ${error.message}`);
    }
  }

  async function deleteSlide(targetLessonId) {
    try {
      await api(`/lessons/${targetLessonId}/slide`, { method: 'DELETE' });
      setMessage('✅ Đã xóa slide PDF.');
      await loadSlides();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  return (
    <section className={`card ${compact ? 'lesson-slide-manager-compact' : ''}`}>
      <SectionHeading
        icon={BookOpen}
        kicker="Learning Materials"
        title="Quản lý slide buổi học"
        description="Tải slide PDF lên từng bài học. File mới sẽ thay thế bản PDF hiện tại."
      />
      <form className="lesson-slide-upload" onSubmit={uploadSlide}>
        <label className="field-label">
          Bài học
          <select className="input mt-2" value={lessonId} onChange={event => setLessonId(event.target.value)}>
            {lessonCatalog.map(lesson => <option key={lesson.id} value={lesson.id}>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</option>)}
          </select>
        </label>
        <div className="field-label lesson-slide-file-field">
          File slide PDF
          <input
            ref={fileInputRef}
            id={`lesson-slide-file-${compact ? 'compact' : 'full'}`}
            className="lesson-slide-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={selectSlideFile}
            required
          />
          <label
            className={`lesson-slide-picker ${file ? 'lesson-slide-picker-selected' : ''}`}
            htmlFor={`lesson-slide-file-${compact ? 'compact' : 'full'}`}
          >
            <Upload size={18} />
            <span>
              <strong>{file ? file.name : 'Chọn file PDF từ thiết bị'}</strong>
              <small>{file ? formatFileSize(file.size) : 'Chạm để mở thư viện tệp'}</small>
            </span>
          </label>
          <small>Tối đa 20 MB · chỉ nhận định dạng .pdf</small>
        </div>
        <button className="btn lesson-slide-submit" type="submit" disabled={busy}>
          <Upload size={17} />{busy ? 'Đang tải lên...' : 'Tải slide lên'}
        </button>
      </form>
      {message && <div className="result-message mt-4">{message}</div>}
      <div className="lesson-slide-list">
        {lessonCatalog.map(lesson => {
          const slide = slides.find(item => item.lesson_id === lesson.id);
          return (
            <div className="lesson-slide-row" key={lesson.id}>
              <div className={`lesson-slide-status ${slide ? 'lesson-slide-status-ready' : ''}`}>
                <BookOpen size={18} />
              </div>
              <div>
                <p>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</p>
                <span>{slide ? `${slide.file_name} · ${formatFileSize(slide.file_size)}` : 'Chưa có slide PDF'}</span>
              </div>
              {slide && (
                <div className="lesson-slide-actions">
                  <button className="btn-secondary" type="button" onClick={() => previewSlide(lesson.id)}>Xem PDF</button>
                  <button className="icon-danger" type="button" title="Xóa slide" onClick={() => deleteSlide(lesson.id)}><Trash2 size={17} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
