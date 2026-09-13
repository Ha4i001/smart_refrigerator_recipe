export default function FloatingElements() {
  const elements = [
    { icon: "🥛", top: "12%", left: "6%", size: "48px", delay: "0s", duration: "7s" },
    { icon: "🍎", top: "22%", right: "8%", size: "44px", delay: "1.2s", duration: "8s" },
    { icon: "🍅", top: "68%", left: "5%", size: "42px", delay: "2.5s", duration: "6.5s" },
    { icon: "🥚", top: "78%", right: "7%", size: "40px", delay: "0.8s", duration: "7.5s" },
    { icon: "🧀", top: "45%", right: "4%", size: "46px", delay: "3s", duration: "9s" },
    { icon: "🥑", top: "52%", left: "4%", size: "44px", delay: "1.7s", duration: "8.5s" },
  ];

  return (
    <div className="floating-ambient-container" aria-hidden="true">
      {elements.map((el, i) => (
        <div
          key={i}
          className="floating-ambient-item"
          style={{
            top: el.top,
            left: el.left,
            right: el.right,
            fontSize: el.size,
            animationDelay: el.delay,
            animationDuration: el.duration,
          }}
        >
          {el.icon}
        </div>
      ))}
    </div>
  );
}
