import { SafeLink } from "@/components/SafeLink";
import { formatNewsDate, NEWS_STATUS_LABEL, newsForSite } from "@/lib/news/siteNews";
import styles from "./SiteNews.module.css";

/** The card it sits in supplies the section's own margin and heading style. */
interface SectionStyle {
  className?: string;
  headingClassName?: string;
}

/** Reports about this site, newest first. Nothing when it has none, so an empty site stays uncluttered. */
export function SiteNews(props: SectionStyle & { siteId: string }) {
  const items = newsForSite(props.siteId);
  if (items.length === 0) return null;
  return (
    <section className={props.className} data-role="site-news" aria-label="News">
      <h3 className={props.headingClassName}>News</h3>
      <p className={styles.note}>Reports about this site. A report does not change its published record.</p>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.id} data-news={item.id}>
            <p className={styles.meta}>
              <time dateTime={item.date}>{formatNewsDate(item.date)}</time>
              <span className={styles.status} data-status={item.status}>{NEWS_STATUS_LABEL[item.status]}</span>
            </p>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.summary}>{item.summary}</p>
            <p className={styles.source}><SafeLink href={item.sourceUrl}>{item.sourceName}</SafeLink></p>
          </li>
        ))}
      </ol>
    </section>
  );
}
