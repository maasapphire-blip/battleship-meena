interface Props {
  message: string
  detail?: string
  tone?: 'info' | 'good' | 'bad'
}

export function StatusBar({ message, detail, tone = 'info' }: Props) {
  return (
    <div className={`status status--${tone}`} role="status" aria-live="polite" data-testid="status">
      <span className="status__msg">{message}</span>
      {detail && <small className="status__detail">{detail}</small>}
    </div>
  )
}
