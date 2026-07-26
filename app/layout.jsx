import "./globals.css";

export const metadata = {
  title: "个人审美评分册",
  description: "逐张记录个人审美偏好，并查看评分统计。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
