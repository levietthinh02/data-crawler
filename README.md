# Puppeteer Web Crawler

## Mô tả

Ứng dụng web này sử dụng Puppeteer để thu thập nội dung và siêu dữ liệu từ các trang web. Nội dung được lưu trữ dưới dạng tệp văn bản và siêu dữ liệu dưới dạng JSON. Các tệp được nén thành một tệp ZIP và có thể tải xuống qua API.

## Cách cài đặt

### 1. Yêu cầu hệ thống
- Node.js >= 14.0
- NPM >= 6.0

### 2. Cài đặt

1. Clone repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```
2. Cài đặt các phụ thuộc:
   ```bash
   npm install
   ```

---

## Cách sử dụng

### 1. Chạy ứng dụng

Khởi động server:
```bash
node crawler.js
```
Server sẽ chạy tại : [http://localhost:3000](http://localhost:3000)

### 2. Gửi yêu cầu API

#### Endpoint: `/api/crawl`
**Phương thức:** `POST`

**Payload:**
```json
{
  "url": "https://example.com",
  "maxDepth": 5,
  "blacklist": ["https://example.com/blacklisted"],
  "tags": ["p", "h1", "h2"]
}
```
- `url`: URL gốc cần thu thập dữ liệu.
- `maxDepth`: Độ sâu tối đa (mặc định là 3).
- `blacklist`: Danh sách các URL cần loại trừ.
- `tags`: Các thẻ HTML cần thu thập nội dung.

**Phản hồi:**
```json
{
  "message": "Crawl completed",
  "downloadUrl": "/public/crawled-data/crawled_data.zip"
}
```
- `downloadUrl`: Đường dẫn tải xuống tệp ZIP chứa dữ liệu đã thu thập.

---