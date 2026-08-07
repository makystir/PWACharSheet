export interface AriaLiveAnnouncerProps {
  message: string;
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function AriaLiveAnnouncer({ message }: AriaLiveAnnouncerProps) {
  return (
    <div aria-live="assertive" role="status" style={visuallyHiddenStyle}>
      {message}
    </div>
  );
}
