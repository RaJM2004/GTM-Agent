export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
      <div className="w-16 h-16 bg-[#FDF8F5] rounded-2xl flex items-center justify-center border border-[#F2DED6] shadow-sm">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="text-gray-500 max-w-md">
        This page is currently under construction. Check back later for updates as we continue building the platform.
      </p>
    </div>
  );
}
