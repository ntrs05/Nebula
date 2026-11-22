/**
 * ======================================================================================
 *  BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG NEBULA (QA SYSTEM TEST SUITE)
 * ======================================================================================
 *  Phụ trách: Role Tester (Chương 6 - Báo cáo Chuyên đề Phát triển Ứng dụng)
 *  Phạm vi: Toàn bộ 9 Use Cases chính (UC01-UC09), Phân quyền RBAC, Boundary, Security
 * ======================================================================================
 */
import { describe, expect, it } from 'vitest';

// Modules Domain Rules & Logic
import { validateLogin, validateRegister } from '../modules/auth/domain/User';
import {
  permissions,
  validateServer,
  validateChannel,
  normalizeChannelName,
  normalizeInviteCode,
  MUTE_OPTIONS,
  NOTIFY_LEVELS,
} from '../modules/server/domain/rules';
import {
  validateOutgoing,
  validateEdit,
  toggleReaction,
  hasReacted,
  mergeMessages,
  startsGroup,
  MAX_MESSAGE_LENGTH,
  MAX_FILES_PER_MESSAGE,
} from '../modules/chat/domain/rules';
import { parseUserCode, validateAddFriend, sortFriends, relationOf } from '../modules/friends/domain/rules';
import { parseQuotaMb, quotaPercent } from '../modules/admin/domain/rules';
import { EventBus } from '../shared/event-bus/EventBus';

describe('QA TEST SUITE: PHÂN HỆ XÁC THỰC & NGƯỜI DÙNG (UC01 - AUTH & IDENTITY)', () => {
  it('[TC_AUTH_01] Đăng ký thành công: Dữ liệu hợp lệ', () => {
    const errors = validateRegister({
      email: 'tester_valid@nebula.local',
      displayName: 'NguyenAn',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
      avatarUrl: 'av-01.svg',
    });
    expect(Object.keys(errors).length).toBe(0);
  });

  it('[TC_AUTH_02] Đăng ký thất bại: Định dạng Email không hợp lệ', () => {
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', 'test@domain'];
    for (const email of invalidEmails) {
      const errors = validateRegister({
        email,
        displayName: 'NguyenAn',
        password: 'Password123',
        confirmPassword: 'Password123',
        avatarUrl: 'av-01.svg',
      });
      expect(errors.email).toBe('Email không hợp lệ');
    }
  });

  it('[TC_AUTH_03] Đăng ký thất bại: Mật khẩu quá ngắn (<6 ký tự)', () => {
    const errors = validateRegister({
      email: 'test@example.com',
      displayName: 'NguyenAn',
      password: '12345',
      confirmPassword: '12345',
      avatarUrl: 'av-01.svg',
    });
    expect(errors.password).toBe('Mật khẩu tối thiểu 6 ký tự');
  });

  it('[TC_AUTH_04] Đăng ký thất bại: Mật khẩu nhập lại không khớp', () => {
    const errors = validateRegister({
      email: 'test@example.com',
      displayName: 'NguyenAn',
      password: 'Password123',
      confirmPassword: 'DifferentPassword456',
      avatarUrl: 'av-01.svg',
    });
    expect(errors.confirmPassword).toBe('Mật khẩu nhập lại không khớp');
  });

  it('[TC_AUTH_05] Đăng nhập: Kiểm tra trường bắt buộc', () => {
    const errors = validateLogin({ email: '', password: '' });
    expect(errors.email).toBe('Email không hợp lệ');
    expect(errors.password).toBe('Vui lòng nhập mật khẩu');
  });

  it('[TC_AUTH_08] Định danh người dùng: Phân tích và chuẩn hóa UserCode 4 số', () => {
    expect(parseUserCode('42')).toBe('0042');
    expect(parseUserCode('#0042')).toBe('0042');
    expect(parseUserCode('9999')).toBe('9999');
    expect(parseUserCode('0')).toBe('0000');
    expect(parseUserCode('')).toBeNull();
    expect(parseUserCode('abc')).toBeNull();
    expect(parseUserCode('10000')).toBeNull(); // Vượt quá 4 chữ số
  });
});

describe('QA TEST SUITE: PHÂN HỆ MÁY CHỦ & PHÂN QUYỀN (UC02 - SERVER MANAGEMENT)', () => {
  it('[TC_SRV_01] Tạo máy chủ: Tên hợp lệ (2-50 ký tự)', () => {
    expect(validateServer({ name: 'Server Nhóm 1', description: 'Mô tả đồ án' })).toBeNull();
  });

  it('[TC_SRV_02] Tạo máy chủ thất bại: Tên quá ngắn (<2 ký tự) hoặc quá dài (>50 ký tự)', () => {
    expect(validateServer({ name: 'A', description: '' })).toBe('Tên server cần ít nhất 2 ký tự');
    expect(validateServer({ name: 'A'.repeat(51), description: '' })).toBe('Tên server tối đa 50 ký tự');
  });

  it('[TC_SRV_04] Chuẩn hóa mã mời: Viết hoa và loại bỏ URL thừa', () => {
    expect(normalizeInviteCode('h8k9p2x4')).toBe('H8K9P2X4');
    expect(normalizeInviteCode('https://nebula.chat/invite/H8K9P2X4')).toBe('H8K9P2X4');
  });

  it('[TC_SRV_06] Phân quyền 3 cấp (RBAC): Chỉ Owner mới được tạo kênh', () => {
    expect(permissions.canCreateChannel('owner')).toBe(true);
    expect(permissions.canCreateChannel('moderator')).toBe(false);
    expect(permissions.canCreateChannel('member')).toBe(false);
    expect(permissions.canCreateChannel(undefined)).toBe(false);
  });

  it('[TC_SRV_07] Phân quyền kiểm duyệt: Cả Owner và Moderator có quyền canModerate', () => {
    expect(permissions.canModerate('owner')).toBe(true);
    expect(permissions.canModerate('moderator')).toBe(true);
    expect(permissions.canModerate('member')).toBe(false);
  });
});

describe('QA TEST SUITE: PHÂN HỆ KÊNH & DANH MỤC (UC03 - CHANNELS & CATEGORIES)', () => {
  it('[TC_CHN_01] Chuẩn hóa tên kênh văn bản (Slug text channel)', () => {
    expect(normalizeChannelName('Thảo Luận Chung', 'text')).toBe('thảo-luận-chung');
    expect(normalizeChannelName('  học tập  2026 ', 'text')).toBe('học-tập-2026');
  });

  it('[TC_CHN_02] Kênh thoại (Voice): Giữ nguyên khoảng trắng và viết hoa', () => {
    expect(normalizeChannelName('Phòng Họp Nhóm 1', 'voice')).toBe('Phòng Họp Nhóm 1');
  });

  it('[TC_CHN_03] Ràng buộc độ dài tên kênh (2-40 ký tự)', () => {
    expect(validateChannel({ name: 'a', topic: '', type: 'text' })).toBe('Tên kênh cần ít nhất 2 ký tự');
    expect(validateChannel({ name: 'Kênh Hợp Lệ', topic: '', type: 'text' })).toBeNull();
  });
});

describe('QA TEST SUITE: PHÂN HỆ TIN NHẮN REALTIME & TỆP (UC04, UC05, UC06 - MESSAGING & MEDIA)', () => {
  it('[TC_MSG_01] Gửi tin nhắn: Kiểm tra tin rỗng', () => {
    expect(validateOutgoing('   ', 0)).toBe('Tin nhắn trống');
    expect(validateOutgoing('', 1)).toBeNull(); // Cho phép tin không chữ nếu có đính kèm file
    expect(validateOutgoing('Tin nhắn hợp lệ', 0)).toBeNull();
  });

  it('[TC_MSG_03] Giới hạn độ dài tin nhắn (Boundary: MAX_MESSAGE_LENGTH)', () => {
    expect(validateOutgoing('a'.repeat(MAX_MESSAGE_LENGTH), 0)).toBeNull();
    expect(validateOutgoing('a'.repeat(MAX_MESSAGE_LENGTH + 1), 0)).toBe(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`);
  });

  it('[TC_MSG_04] Giới hạn số lượng tệp đính kèm tối đa', () => {
    expect(validateOutgoing('File kèm', MAX_FILES_PER_MESSAGE)).toBeNull();
    expect(validateOutgoing('File kèm', MAX_FILES_PER_MESSAGE + 1)).toBe(`Tối đa ${MAX_FILES_PER_MESSAGE} tệp mỗi tin nhắn`);
  });

  it('[TC_MSG_05] Chỉnh sửa tin nhắn: Kiểm tra nội dung sửa hợp lệ', () => {
    expect(validateEdit('   ')).toBe('Nội dung không được để trống');
    expect(validateEdit('Nội dung mới hợp lệ')).toBeNull();
    expect(validateEdit('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toBe(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`);
  });

  it('[TC_MSG_09] Cảm xúc Emoji: Toggle reaction (Thêm lần 1, gỡ lần 2)', () => {
    const userA = 'user_01';
    let reactions = toggleReaction([], '👍', userA);
    expect(reactions.length).toBe(1);
    expect(reactions[0].count).toBe(1);
    expect(hasReacted(reactions[0], userA)).toBe(true);

    // Bấm lại lần 2 để gỡ
    reactions = toggleReaction(reactions, '👍', userA);
    expect(reactions.length).toBe(0);
  });

  it('[TC_MSG_10] Khử trùng lặp tin nhắn & Khớp nối Nonce (Optimistic Merge)', () => {
    const localPending = [
      { id: 'tmp-1', nonce: 'nonce-123', content: 'Tin đang gửi...', createdAt: '2026-11-22T08:00:00Z', status: 'sending' as const, author: { id: 'u1', displayName: 'An' } },
    ];
    const serverConfirmed = [
      { id: 'srv-999', nonce: 'nonce-123', content: 'Tin đang gửi...', createdAt: '2026-11-22T08:00:00Z', status: 'sent' as const, author: { id: 'u1', displayName: 'An' } },
    ];
    const merged = mergeMessages(localPending as any, serverConfirmed as any);
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('srv-999');
    expect(merged[0].status).toBe('sent');
  });

  it('[TC_MSG_11] Gom nhóm tin nhắn hiển thị (Group window: 5 phút)', () => {
    const msg1 = { id: '1', author: { id: 'u1' }, createdAt: '2026-11-22T09:00:00Z' } as any;
    const msg2SameUserClose = { id: '2', author: { id: 'u1' }, createdAt: '2026-11-22T09:02:00Z' } as any;
    const msg3DifferentUser = { id: '3', author: { id: 'u2' }, createdAt: '2026-11-22T09:02:30Z' } as any;
    const msg4SameUserFar = { id: '4', author: { id: 'u1' }, createdAt: '2026-11-22T09:10:00Z' } as any;

    expect(startsGroup(undefined, msg1)).toBe(true);
    expect(startsGroup(msg1, msg2SameUserClose)).toBe(false); // Cùng tác giả trong 2 phút -> gộp
    expect(startsGroup(msg2SameUserClose, msg3DifferentUser)).toBe(true); // Khác tác giả -> tách
    expect(startsGroup(msg2SameUserClose, msg4SameUserFar)).toBe(true); // Cách 8 phút (> 5p) -> tách
  });
});

describe('QA TEST SUITE: PHÂN HỆ BẠN BÈ & CHAT 1-1 (EXT01, EXT02 - FRIENDS & DIRECT)', () => {
  it('[TC_FRD_01] Xác thực biểu mẫu Thêm bạn bằng Tag (Tên + ID 4 số)', () => {
    expect(Object.keys(validateAddFriend({ displayName: 'HoangNam', userCode: '0042' })).length).toBe(0);
    expect(validateAddFriend({ displayName: '', userCode: '0042' }).displayName).toBeDefined();
    expect(validateAddFriend({ displayName: 'HoangNam', userCode: 'invalid' }).userCode).toBeDefined();
  });

  it('[TC_FRD_02] Xác định quan hệ: Chặn tự kết bạn với chính mình', () => {
    const emptyLists = { friends: [], incoming: [], outgoing: [] };
    expect(relationOf('my_id', 'my_id', emptyLists)).toBe('self');
  });

  it('[TC_FRD_04] Sắp xếp bạn bè: Ưu tiên Online lên trước, sau đó theo tên tiếng Việt', () => {
    const friends = [
      { user: { id: '1', displayName: 'Bình', status: 'Offline' } },
      { user: { id: '2', displayName: 'Cường', status: 'Online' } },
      { user: { id: '3', displayName: 'An', status: 'Online' } },
    ] as any;
    const sorted = sortFriends(friends);
    expect(sorted.map((f) => f.user.displayName)).toEqual(['An', 'Cường', 'Bình']);
  });
});

describe('QA TEST SUITE: PHÂN HỆ QUẢN TRỊ ADMIN HỆ THỐNG (EXT04 - ADMIN PORTAL)', () => {
  it('[TC_ADM_01] Tính phần trăm dung lượng Quota sử dụng (0 - 100%)', () => {
    expect(quotaPercent(50, 100)).toBe(50);
    expect(quotaPercent(100, 100)).toBe(100);
    expect(quotaPercent(150, 100)).toBe(100); // Tối đa 100%
    expect(quotaPercent(10, 0)).toBe(100); // Hạn mức 0 coi như đầy
  });

  it('[TC_ADM_02] Phân tích hạn mức dung lượng MB người dùng nhập (parseQuotaMb)', () => {
    expect(parseQuotaMb('500')).toBe(500);
    expect(parseQuotaMb('1024,5')).toBe(1024);
    expect(parseQuotaMb('-10')).toBeNull();
    expect(parseQuotaMb('abc')).toBeNull();
    expect(parseQuotaMb('2000000')).toBeNull(); // Vượt quá 1.000.000 MB
  });
});

describe('QA TEST SUITE: PHÂN HỆ THÔNG BÁO & KIẾN TRÚC PUB-SUB', () => {
  it('[TC_NOTI_01] Tùy chọn tắt âm: Hỗ trợ đầy đủ các mốc thời gian', () => {
    expect(MUTE_OPTIONS.map((o) => o.id)).toEqual(['15m', '1h', '3h', '8h', '24h', 'forever']);
    expect(NOTIFY_LEVELS.map((l) => l.id)).toEqual(['all', 'mentions', 'nothing']);
  });

  it('[TC_ARCH_01] EventBus: Đảm bảo giao tiếp Pub-Sub độc lập giữa các module', () => {
    const bus = new EventBus();
    const received: string[] = [];
    const unsubscribe = bus.subscribe('test.event' as any, (payload: any) => {
      received.push(payload.data);
    });

    bus.publish('test.event' as any, { data: 'hello' });
    expect(received).toEqual(['hello']);

    unsubscribe();
    bus.publish('test.event' as any, { data: 'world' });
    expect(received).toEqual(['hello']); // Không nhận thêm sự kiện sau khi hủy đăng ký
  });
});
