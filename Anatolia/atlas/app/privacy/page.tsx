import type { Metadata } from "next";
import { SafeLink } from "@/components/SafeLink";
import ui from "@/components/globe/chrome/chrome.module.css";
import { ThemeFromPreference } from "../puzzles/ThemeFromPreference";
import styles from "../puzzles/puzzles.module.css";

export const metadata: Metadata = {
  title: "Privacy · Atlas of early monuments",
  description: "What the atlas stores when you sign in, where it is kept, who can see it, and how to delete it.",
};

// Where this copy's Neon project runs. Change it when the project moves; docs/accounts.md says how to look it up.
const ACCOUNT_DATA_PLACE = "the United States (Neon, on Amazon Web Services in Ohio)";
const ISSUES = "https://github.com/GBurchell27/ai-archaeology/issues";
const ACCOUNTS_DOC = "https://github.com/GBurchell27/ai-archaeology/blob/main/docs/accounts.md";

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "Without an account",
    points: [
      "The atlas is open to everyone and needs no account. It has no advertising, no analytics and no tracking.",
      "Your browser keeps your settings (theme, layers, timeline) on your own device. They are not sent anywhere.",
      "The globe's imagery comes from NASA or, if you choose it, EOX; a site card's photograph comes from Wikimedia Commons. Those hosts see your IP address and browser, as any website you open does. So does the company that hosts this site.",
    ],
  },
  {
    title: "If you sign in",
    points: [
      "Signing in is optional. It lets you keep lists of sites you want to visit or have visited, and vote for sites.",
      "The sign-in service (Neon Auth) keeps the email address you sign in with and, for each session, the IP address and browser it was made from. If you sign in with Google, Google also sends the name and picture of your Google profile.",
      "The atlas itself keeps the ids of the sites you save or vote for, which list each is on, and when you added it. Nothing else: no notes, no locations of your own.",
      "Two cookies in your browser keep you signed in. They are used for nothing else.",
    ],
  },
  {
    title: "Who can see it",
    points: [
      "Other visitors see only how many votes each site has. Not who voted, and nothing about your lists.",
      "The person who runs this copy of the atlas can read the database. Nothing in it is sold, shared or used for anything but the features above.",
      `The data is kept in ${ACCOUNT_DATA_PLACE}.`,
    ],
  },
  {
    title: "Deleting it",
    points: [
      "“Your places” has two buttons. “Delete my saved data” removes your lists and votes and keeps the sign-in. “Delete my account” removes the sign-in, its sessions, your lists and your votes, at once and for good.",
      "Signing in with Google again later makes a new, empty account.",
    ],
  },
];

/** The privacy notice the sign-in links to. Plain statements of what docs/accounts.md records. */
export default function PrivacyPage() {
  return (
    <div className={`${ui.scroll} ${styles.page}`}>
      <ThemeFromPreference />
      <div className={`${ui.prose} ${styles.sheet}`}>
        <header>
          <nav aria-label="Atlas" className={styles.back}><a href="/">← Back to the atlas</a></nav>
          <p className={ui.eyebrow}>Accounts</p>
          <h1 className={`${ui.serif} ${styles.title}`}>Privacy</h1>
          <p className={`${ui.serif} ${styles.lead}`}>What the atlas stores when you sign in, where it is kept, who can see it, and how to delete it.</p>
        </header>
        <main>
          {SECTIONS.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h2 className={`${ui.serif} ${styles.site}`}>{section.title}</h2>
              <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
            </section>
          ))}
          <p>
            This is a hobby project with open source code. <SafeLink href={ACCOUNTS_DOC}>The accounts document</SafeLink> describes
            the tables and the code. Questions and requests go to <SafeLink href={ISSUES}>the project&rsquo;s issue tracker</SafeLink>;
            do not put personal details in an issue.
          </p>
        </main>
      </div>
    </div>
  );
}
