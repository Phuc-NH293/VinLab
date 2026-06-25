import { ScanFace } from 'lucide-react';

export function StudentPhoto({ student }) {
  if (student.face_image_path) {
    return (
      <img
        className="student-photo"
        src={student.face_image_path}
        alt={`Ảnh ${student.full_name}`}
      />
    );
  }
  return <div className="student-avatar">{student.full_name?.charAt(0) || 'S'}</div>;
}

export function BFaceThumbnail({ student }) {
  return (
    <div className="bface-thumbnail" title={student.face_image_path ? `BFace của ${student.full_name}` : 'Chưa có ảnh BFace'}>
      {student.face_image_path
        ? <img src={student.face_image_path} alt={`BFace ${student.full_name}`} />
        : <ScanFace size={19} />}
    </div>
  );
}
