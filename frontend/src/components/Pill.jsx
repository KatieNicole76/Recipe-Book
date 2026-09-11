function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2 rounded-full text-body-2 border border-blue cursor-pointer flex items-center gap-1 ${
        active ? 'bg-blue text-white' : 'bg-transparent text-blue'
      }`}>
      {label}
    </button>
  );
}

export default Pill;