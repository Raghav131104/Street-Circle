export default function NotificationsPanel({ notifications, unreadCount, nextCursor, error, onRead, onReadAll, onLoadMore }) {
  return <section className="notifications-panel" aria-labelledby="notifications-heading">
    <header>
      <div><span className="eyebrow">Durable inbox</span><h2 id="notifications-heading">Notifications <sup>{unreadCount}</sup></h2></div>
      {unreadCount > 0 && <button type="button" onClick={onReadAll}>Mark all read</button>}
    </header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="notification-list">
      {notifications.map((notification) => <article key={notification.id} className={notification.readAt ? "read" : "unread"}>
        <div><strong>{notification.title}</strong>{!notification.readAt && <i aria-label="Unread"/>}</div>
        <p>{notification.body}</p>
        <footer><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>{!notification.readAt && <button type="button" onClick={() => onRead(notification.id)}>Mark read</button>}</footer>
      </article>)}
      {notifications.length === 0 && <p className="request-empty">No notifications yet.</p>}
    </div>
    {nextCursor && <button className="load-more" type="button" onClick={() => onLoadMore(nextCursor)}>Load older</button>}
  </section>;
}
