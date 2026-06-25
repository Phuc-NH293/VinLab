import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VinLab page crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="card page-error">
        <div className="page-error-icon"><AlertTriangle size={28} /></div>
        <div>
          <p className="section-kicker">Không thể mở màn hình</p>
          <h3>Trang này vừa gặp lỗi</h3>
          <p>Ứng dụng vẫn hoạt động. Hãy tải lại riêng màn hình này để tiếp tục.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => this.setState({ error: null })}>
            <RefreshCw size={17} />Thử lại
          </button>
        </div>
      </section>
    );
  }
}

export class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VinLab root crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="root-error">
        <div className="root-error-panel">
          <AlertTriangle size={34} />
          <h1>VINLAB gặp lỗi hiển thị</h1>
          <p>{this.state.error?.message || 'Không thể tải giao diện.'}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />Tải lại ứng dụng
          </button>
        </div>
      </main>
    );
  }
}
