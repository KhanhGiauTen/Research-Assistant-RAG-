# Luật Làm Việc Cho Agent

File này là luật cấp repo. Mọi agent/Codex session làm việc trong repo này phải đọc và tuân thủ trước khi phân tích hoặc chỉnh sửa.

## Tài Liệu Bắt Buộc Đọc Đầu Phiên

1. Đọc `docs/ARCHITECTURE.md` để nắm kiến trúc, mục tiêu nghiên cứu, luồng chạy local, endpoint chính và quy ước dữ liệu.
2. Đọc `docs/implement-notes.html`, ưu tiên các card mới nhất, để biết các thay đổi/quyết định gần đây.
3. Nếu hai file trên thiếu, hỏng format, hoặc mâu thuẫn với code hiện tại, tạo/sửa chúng trước khi tiếp tục và ghi rõ vào note.

## Ghi Note Khi Đụng Mã Nguồn

- Mọi thay đổi chạm mã nguồn, test, script, config runtime, API contract, prompt, UI, dependency, hoặc tài liệu vận hành đều phải được ghi vào `docs/implement-notes.html`.
- Note phải viết bằng tiếng Việt.
- Note phải nằm trong card HTML và sắp xếp theo thời gian gần nhất ở trên cùng.
- Header card phải có thời gian cụ thể kèm timezone và người note dựa trên GitHub username. Ưu tiên lấy bằng `git config --get github.user`; nếu trống thì lấy owner từ `git remote -v`; nếu vẫn không có thì dùng `git config --get user.name`.
- Mỗi card nên có: bối cảnh, quyết định, file đã chạm, tác động, kiểm thử/xác minh, rủi ro hoặc việc tiếp theo.
- Nếu thay đổi có nhiều commit, ghi note theo từng cụm thay đổi có ý nghĩa, không gom mơ hồ.

## Cập Nhật Kiến Trúc

- `docs/ARCHITECTURE.md` là bản đồ để phiên mới hiểu dự án mà không cần quét toàn bộ repo.
- Cập nhật file này ngay khi có thay đổi về kiến trúc, luồng sử dụng, endpoint/API contract, setup, dependency, dữ liệu, security boundary, hoặc chiến lược test.
- Nội dung phải ngắn gọn nhưng đủ để khởi động phiên mới: mục tiêu sản phẩm, stack, cấu trúc thư mục, luồng RAG, endpoint, lệnh chạy/test, dữ liệu local/private, và định hướng kỹ thuật.

## Merge Conflict

- Khi merge/rebase có conflict, trước khi resolve phải ghi nhận vào `docs/implement-notes.html` các phiên bản đang xung đột theo timestamp nếu xác định được.
- Đánh giá hiệu quả/tác động của từng phía: đúng chức năng, ít rủi ro dữ liệu, giữ contract hiện có, khả năng test, độ phù hợp với mục tiêu nghiên cứu.
- Sau đó mới chọn phương án giải quyết, ghi rõ lý do và các lệnh kiểm thử đã chạy.

## Git Và Push

- Không dùng `git add .`; chỉ stage explicit các file cần commit.
- Trước commit nên chạy `git status --short`, `git diff --check`, và khi đã stage thì `git diff --cached --check`.
- Commit theo từng thay đổi có ý nghĩa; sau commit đạt yêu cầu thì push lên remote hiện tại, trừ khi user yêu cầu nhánh/quy trình khác.
- Không commit dữ liệu cá nhân hoặc artifact local: `.env`, PDF trong `backend/data/papers`, Chroma DB, logs, `.local`, `node_modules`, `.next`, cache.

## Ngôn Ngữ Và Phạm Vi

- Trao đổi với user bằng tiếng Việt khi user dùng tiếng Việt.
- Giữ thay đổi nhỏ, có kiểm chứng, ưu tiên pattern hiện có trong repo.
- Nếu phải tái cấu trúc lớn, chia thành các commit nhỏ, mỗi commit cập nhật note và kiến trúc tương ứng.
