# BỘ KIỂM THỬ HỆ THỐNG VÀ MA TRẬN TEST CASES (QA TEST SUITE)
**Dự án**: Hệ thống Chat & Voice Realtime (Nebula — Discord Mini)  
**Nhánh Git**: `Test`  
**Người thực hiện**: Role Tester (Phụ trách Chương 6 Báo cáo Chuyên đề)  
**Ngày cập nhật**: 22/11/2026  

---

## 1. Hướng dẫn chạy kiểm thử tự động (How to Run)

Bộ kiểm thử tự động dành riêng cho QA được lưu trữ tại:
📁 [`frontend/src/integration/qa-system-cases.test.ts`](frontend/src/integration/qa-system-cases.test.ts)

Để thực thi bộ kiểm thử này, mở terminal tại thư mục `frontend`:

```bash
cd frontend
npm install
npx vitest run src/integration/qa-system-cases.test.ts
```

Hoặc chạy toàn bộ hệ thống kiểm thử:
```bash
npm test              # Chạy toàn bộ 27 test suites
npm run check:arch    # Kiểm tra tuân thủ kiến trúc Modular Monolith (200 tệp tin)
```

---

## 2. Ma trận và Danh sách Ca kiểm thử (Test Matrix)

Bộ kiểm thử bao quát toàn bộ các ca nghiệp vụ từ **UC01 đến UC09**, phân quyền 3 cấp (Owner - Moderator - Member), các trường hợp biên và kiểm thử bảo mật:

### 2.1. Phân hệ Xác thực & Người dùng (UC01 — Auth & Identity)
- `[TC_AUTH_01]`: Đăng ký thành công với Email, Password và DisplayName hợp lệ.
- `[TC_AUTH_02]`: Đăng ký thất bại khi định dạng Email sai (`invalid-email`, `test@`, `@domain.com`).
- `[TC_AUTH_03]`: Đăng ký thất bại khi Mật khẩu ngắn dưới 6 ký tự.
- `[TC_AUTH_04]`: Đăng ký thất bại khi Mật khẩu xác nhận không trùng khớp.
- `[TC_AUTH_05]`: Đăng nhập: Bắt buộc nhập đầy đủ Email và Mật khẩu.
- `[TC_AUTH_08]`: Định danh người dùng: Phân tích và tự động đệm số Tag 4 chữ số (`42` -> `0042`, `#0042` -> `0042`, chặn số âm hoặc >9999).

### 2.2. Phân hệ Máy chủ & Phân quyền (UC02 — Server Management)
- `[TC_SRV_01]`: Tạo máy chủ thành công với tên từ 2 đến 50 ký tự.
- `[TC_SRV_02]`: Chặn tạo máy chủ khi tên <2 ký tự hoặc >50 ký tự.
- `[TC_SRV_04]`: Chuẩn hóa mã mời: Tự động viết hoa và bóc tách URL thừa (`https://nebula.chat/invite/H8K9P2X4` -> `H8K9P2X4`).
- `[TC_SRV_06]`: Phân quyền RBAC: Chỉ duy nhất Chủ server (`owner`) mới có quyền tạo kênh (`canCreateChannel`).
- `[TC_SRV_07]`: Phân quyền kiểm duyệt: Cả `owner` và `moderator` đều có quyền kiểm duyệt (`canModerate`).

### 2.3. Phân hệ Kênh & Danh mục (UC03 — Channels & Categories)
- `[TC_CHN_01]`: Chuẩn hóa tên kênh text: Chuyển chữ thường, thay khoảng trắng bằng dấu gạch ngang (`Thảo Luận Chung` -> `thảo-luận-chung`).
- `[TC_CHN_02]`: Kênh thoại (Voice): Giữ nguyên khoảng trắng và chữ hoa chữ thường (`Phòng Họp Nhóm 1`).
- `[TC_CHN_03]`: Ràng buộc độ dài tên kênh từ 2 đến 40 ký tự.

### 2.4. Phân hệ Tin nhắn Realtime & Tệp (UC04, UC05, UC06 — Messaging & Media)
- `[TC_MSG_01]`: Chặn gửi tin nhắn rỗng (khoảng trắng không có tệp đính kèm).
- `[TC_MSG_03]`: Ràng buộc giới hạn độ dài tin nhắn tối đa 2000 ký tự phía Client (Boundary test).
- `[TC_MSG_04]`: Ràng buộc số lượng tệp đính kèm tối đa 5 tệp mỗi tin nhắn.
- `[TC_MSG_05]`: Kiểm tra nội dung sửa tin nhắn: Không được rỗng, tối đa 2000 ký tự.
- `[TC_MSG_09]`: Thả cảm xúc Emoji: Cơ chế Toggle (Bấm lần 1: Thêm reaction, Bấm lần 2: Gỡ reaction).
- `[TC_MSG_10]`: Khử trùng lặp tin nhắn và khớp nối Nonce: Thay thế tin gửi lạc quan bằng tin server xác nhận mà không nhân đôi.
- `[TC_MSG_11]`: Gom nhóm tin nhắn hiển thị: Tự động gộp tin của cùng tác giả gửi trong vòng 5 phút, tách nhóm nếu khác tác giả hoặc khác ngày.

### 2.5. Phân hệ Bạn bè & Trò chuyện Trực tiếp (EXT01, EXT02 — Friends & Direct)
- `[TC_FRD_01]`: Biểu mẫu thêm bạn bằng Tag yêu cầu có cả Tên hiển thị và UserCode 4 số.
- `[TC_FRD_02]`: Ngăn chặn người dùng tự gửi lời mời kết bạn cho chính mình (`relation = 'self'`).
- `[TC_FRD_04]`: Sắp xếp danh sách bạn bè: Ưu tiên trạng thái Online lên đầu, sau đó sắp xếp theo bảng chữ cái tiếng Việt.

### 2.6. Phân hệ Quản trị Hệ thống & Quota (EXT04 — Admin Portal)
- `[TC_ADM_01]`: Tính toán chính xác phần trăm dung lượng bộ nhớ Quota đã sử dụng (0 - 100%).
- `[TC_ADM_02]`: Phân tích và kiểm tra tính hợp lệ của hạn mức dung lượng MB do Admin nhập.

### 2.7. Phân hệ Thông báo & Event Bus
- `[TC_NOTI_01]`: Hỗ trợ đầy đủ các mốc thời gian tắt âm: 15m, 1h, 3h, 8h, 24h và vô thời hạn (`forever`).
- `[TC_ARCH_01]`: Kiểm tra tính toàn vẹn của Event Bus Pub-Sub: Module đăng ký nhận sự kiện và hủy đăng ký chính xác.

---

## 3. Nhật ký Khiếm khuyết đã ghi nhận (Defect Log)

- **Mã lỗi**: `BUG-E2E-001`
- **Mô tả**: Mismatch vai trò thành viên trong `nebula.integration.test.ts:150` (Kỳ vọng `admin` thay vì `owner`).
- **Phân loại**: Test Specification Discrepancy.
- **Trạng thái**: Ghi nhận chính thức vào Báo cáo Chương 6, bàn giao Developer xử lý.
