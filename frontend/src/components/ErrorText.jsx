function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-danger text-body-2 mt-4 mb-2 text-center">{children}</p>;
}

export default ErrorText;
