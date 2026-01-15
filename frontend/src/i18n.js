import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "nav": {
                "dashboard": "Dashboard",
                "admin": "Cameras",
                "groups": "Groups",
                "files": "Files",
                "demo": "Demo",
                "logout": "Logout"
            },
            "login": {
                "title": "Fall Detection System",
                "subtitle": "Sign in to your account",
                "username": "Username",
                "password": "Password",
                "button": "Sign In",
                "error": "Invalid username or password"
            },
            "dashboard": {
                "no_streams": "No active streams. Add a source to start monitoring.",
                "recent_alerts": "Recent Alerts",
                "no_events": "No fall events detected yet.",
                "fall_detected": "Fall Detected",
                "score": "Score",
                "track_id": "Track ID",
                "resolved": "Resolved",
                "by": "by"
            },
            "demo": {
                "title": "Demo Controls",
                "subtitle": "Upload a video file to simulate a camera feed and test the fall detection algorithm.",
                "upload_text": "Click to Upload Video",
                "upload_hint": "MP4, AVI, MKV supported",
                "start": "Start Simulation",
                "stop": "Stop Simulation",
                "processing": "Processing...",
                "uploading_file": "Uploading video file...",
                "upload_complete": "Upload complete: {{filename}}",
                "source_created": "Created source ID: {{id}}",
                "pipeline_started": "Pipeline started. Analyzing video...",
                "pipeline_stopped": "Pipeline stopped.",
                "error": "Error: {{message}}",
                "failed_to_start": "Failed to start demo. See logs.",
                "logs": "System Logs",
                "ready": "Ready...",
                "waiting": "Waiting for simulation...",
                "live": "LIVE PROCESSING",
                "detected_events": "Detected Events",
                "chat_id": "Telegram Chat ID",
                "bot_token": "Telegram Bot Token",
                "optional": "Optional"
            },
            "admin": {
                "title": "Camera Management",
                "add_camera": "Add New Camera",
                "edit_camera": "Edit Camera",
                "name": "Camera Name",
                "url": "RTSP URL / Source",
                "type": "Source Type",
                "group": "Assign to Group",
                "no_group": "No Group",
                "save": "Save Camera",
                "cancel": "Cancel",
                "confirm_delete": "Are you sure you want to delete this camera?",
                "save_failed": "Failed to save source",
                "status_active": "Active",
                "status_idle": "Idle",
                "no_cameras": "No cameras configured. Click 'Add Camera' to get started.",
                "table": {
                    "id": "ID",
                    "name": "Name",
                    "source": "Source",
                    "group": "Group",
                    "type": "Type",
                    "status": "Status",
                    "actions": "Actions"
                }
            },
            "files": {
                "title": "File Resources",
                "upload_video": "Upload Video",
                "uploading": "Uploading...",
                "confirm_delete": "Are you sure you want to delete this file source?",
                "upload_failed": "Upload failed",
                "status_playing": "Playing",
                "status_idle": "Idle",
                "no_files": "No video files found. Upload a video to test.",
                "table": {
                    "id": "ID",
                    "filename": "Filename",
                    "path": "Path",
                    "status": "Status",
                    "actions": "Actions"
                }
            },
            "groups": {
                "title": "Group Management",
                "add_group": "Add New Group",
                "edit_group": "Edit Group",
                "name": "Group Name",
                "chat_id": "Telegram Chat ID",
                "bot_token": "Telegram Bot Token",
                "optional": "Optional",
                "save": "Save Group",
                "cancel": "Cancel",
                "confirm_delete": "Are you sure you want to delete this group?",
                "save_failed": "Failed to save group",
                "no_groups": "No groups configured. Click 'Add Group' to get started.",
                "table": {
                    "id": "ID",
                    "name": "Name",
                    "chat_id": "Telegram Chat ID",
                    "actions": "Actions"
                }
            }
        }
    },
    vi: {
        translation: {
            "nav": {
                "dashboard": "Bảng điều khiển",
                "admin": "Máy ảnh",
                "groups": "Nhóm",
                "files": "Tệp tin",
                "demo": "Bản thử nghiệm",
                "logout": "Đăng xuất"
            },
            "login": {
                "title": "Hệ thống Cảnh báo Ngã",
                "subtitle": "Đăng nhập vào tài khoản của bạn",
                "username": "Tên đăng nhập",
                "password": "Mật khẩu",
                "button": "Đăng nhập",
                "error": "Tên đăng nhập hoặc mật khẩu không đúng"
            },
            "dashboard": {
                "no_streams": "Không có luồng video nào đang hoạt động. Thêm nguồn để bắt đầu giám sát.",
                "recent_alerts": "Cảnh báo gần đây",
                "no_events": "Chưa phát hiện sự cố ngã nào.",
                "fall_detected": "Phát hiện ngã",
                "score": "Điểm số",
                "track_id": "ID đối tượng",
                "resolved": "Đã xử lý",
                "by": "bởi"
            },
            "demo": {
                "title": "Điều khiển Demo",
                "subtitle": "Tải lên tệp video để mô phỏng luồng camera và kiểm tra thuật toán phát hiện ngã.",
                "upload_text": "Nhấp để tải lên Video",
                "upload_hint": "Hỗ trợ MP4, AVI, MKV",
                "start": "Bắt đầu mô phỏng",
                "stop": "Dừng mô phỏng",
                "processing": "Đang xử lý...",
                "uploading_file": "Đang tải lên tệp video...",
                "upload_complete": "Tải lên hoàn tất: {{filename}}",
                "source_created": "Đã tạo nguồn ID: {{id}}",
                "pipeline_started": "Đã bắt đầu xử lý. Đang phân tích video...",
                "pipeline_stopped": "Đã dừng xử lý.",
                "error": "Lỗi: {{message}}",
                "failed_to_start": "Không thể bắt đầu demo. Xem nhật ký.",
                "logs": "Nhật ký hệ thống",
                "ready": "Sẵn sàng...",
                "waiting": "Đang chờ mô phỏng...",
                "live": "ĐANG XỬ LÝ TRỰC TIẾP",
                "detected_events": "Sự cố đã phát hiện",
                "chat_id": "Telegram Chat ID",
                "bot_token": "Telegram Bot Token",
                "optional": "Tùy chọn"
            },
            "admin": {
                "title": "Quản lý Camera",
                "add_camera": "Thêm Camera mới",
                "edit_camera": "Chỉnh sửa Camera",
                "name": "Tên Camera",
                "url": "Đường dẫn RTSP / Nguồn",
                "type": "Loại nguồn",
                "group": "Chỉ định vào Nhóm",
                "no_group": "Không có nhóm",
                "save": "Lưu Camera",
                "cancel": "Hủy bỏ",
                "confirm_delete": "Bạn có chắc chắn muốn xóa camera này không?",
                "save_failed": "Không thể lưu nguồn video",
                "status_active": "Hoạt động",
                "status_idle": "Chờ",
                "no_cameras": "Chưa có camera nào được cấu hình. Nhấp vào 'Thêm Camera' để bắt đầu.",
                "table": {
                    "id": "ID",
                    "name": "Tên",
                    "source": "Nguồn",
                    "group": "Nhóm",
                    "type": "Loại",
                    "status": "Trạng thái",
                    "actions": "Hành động"
                }
            },
            "files": {
                "title": "Tài nguyên Tệp",
                "upload_video": "Tải lên Video",
                "uploading": "Đang tải lên...",
                "confirm_delete": "Bạn có chắc chắn muốn xóa nguồn tệp này không?",
                "upload_failed": "Tải lên thất bại",
                "status_playing": "Đang phát",
                "status_idle": "Chờ",
                "no_files": "Không tìm thấy tệp video nào. Tải lên video để kiểm tra.",
                "table": {
                    "id": "ID",
                    "filename": "Tên tệp",
                    "path": "Đường dẫn",
                    "status": "Trạng thái",
                    "actions": "Hành động"
                }
            },
            "groups": {
                "title": "Quản lý Nhóm",
                "add_group": "Thêm Nhóm mới",
                "edit_group": "Chỉnh sửa Nhóm",
                "name": "Tên Nhóm",
                "chat_id": "Telegram Chat ID",
                "bot_token": "Telegram Bot Token",
                "optional": "Tùy chọn",
                "save": "Lưu Nhóm",
                "cancel": "Hủy bỏ",
                "confirm_delete": "Bạn có chắc chắn muốn xóa nhóm này không?",
                "save_failed": "Không thể lưu nhóm",
                "no_groups": "Chưa có nhóm nào được cấu hình. Nhấp vào 'Thêm Nhóm' để bắt đầu.",
                "table": {
                    "id": "ID",
                    "name": "Tên",
                    "chat_id": "Telegram Chat ID",
                    "actions": "Hành động"
                }
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'vi', // Default to Vietnamese as requested
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
