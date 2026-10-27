/** The svā wordmark, set in type so it stays crisp at any size. */
export default function Wordmark({ labs = false, className = "" }: { labs?: boolean; className?: string }) {
  return (
    <span className={`wordmark ${className}`} aria-label={labs ? "svā labs" : "svā"}>
      <span aria-hidden>svā</span>
      {labs && <span className="wordmark__labs" aria-hidden> labs</span>}
    </span>
  );
}
