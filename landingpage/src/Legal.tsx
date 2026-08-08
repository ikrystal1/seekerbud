import { Link } from 'react-router-dom'

type Section = { title: string; body: string }

function Sections({ items }: { items: Section[] }) {
  return (
    <div className="legalBody">
      {items.map((s) => (
        <div key={s.title}>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  )
}

const TERMS: Section[] = [
  {
    title: 'Agreement to Terms',
    body: 'These Terms of Service ("Terms") are an agreement between you and Ayeni Faith, operating the SeekerBud application and website ("SeekerBud", "we", "us", or "our"), and govern your access to and use of the SeekerBud mobile application and website (collectively, the "Service"). By installing, accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.',
  },
  {
    title: 'Non-Custodial Wallet Access',
    body: 'SeekerBud is a non-custodial application. We never hold, store, or control your private keys, seed phrases, or digital assets. All cryptographic keys remain in the secure storage of your device (including the Seed Vault on Solana Mobile devices) and never leave your device. You are solely responsible for the safekeeping of your keys and seed phrase. Any loss of access resulting from lost, compromised, or mishandled credentials is your responsibility.',
  },
  {
    title: 'No Financial Advice or Guarantees',
    body: 'SeekerBud provides informational and transaction-relaying assistance. Nothing in the Service constitutes financial, investment, legal, or tax advice. Digital assets are volatile and may lose value. We do not guarantee any outcome, return, or the availability, accuracy, or reliability of blockchain data or of third-party services (including RPC providers and AI models) used to power the Service.',
  },
  {
    title: 'Transactions Are Irreversible',
    body: 'When you approve a transaction, you are solely responsible for its details. Blockchain transactions are generally irreversible once confirmed. We cannot cancel, reverse, or recover a submitted transaction. Always review amounts, recipients, and network fees before approving.',
  },
  {
    title: 'Payment Terms',
    body: 'SeekerBud may charge a small per-message fee in USDC, settled through the x402 payment protocol on the Solana blockchain. You authorize us to request and you approve such payments through your wallet. Fees are set by SeekerBud and may change from time to time with reasonable notice. Prepaid balances are non-refundable except as required by applicable law.',
  },
  {
    title: 'Acceptable Use and Restricted Content',
    body: 'You agree not to use the Service to create, transmit, or promote content that: (a) violates applicable law, including content that facilitates the sale of illegal substances, the abuse or exploitation of children, or pornography, prostitution, or other sexual content; (b) infringes the intellectual property rights of any third party; (c) constitutes hate speech or threatens, promotes, or incites hatred or violence against individuals or groups; (d) depicts or promotes gratuitous violence, self-harm, or dangerous activity; (e) makes false or misleading health claims or contains deliberately misleading content, including false affiliation with any third party; or (f) interferes with the proper function of government. You also agree not to: attempt to gain unauthorized access to the Service or its systems; use the Service to launder money, finance terrorism, or evade sanctions; introduce malware or exploit security vulnerabilities; or circumvent security protections of any device, network, or service. We may suspend or terminate access for violations of these Terms.',
  },
  {
    title: 'Your Content and Moderation',
    body: 'You are solely responsible for the messages and other content you submit through the Service. Messages are processed to answer your requests and are not published publicly. We do not knowingly permit content that violates the Acceptable Use and Restricted Content section above. You can report concerning content by emailing haryokrystal@gmail.com, and we will review and remove content that violates these Terms. We may moderate content and may restrict or block users who repeatedly violate these Terms.',
  },
  {
    title: 'Third-Party Services',
    body: 'The Service may rely on third-party infrastructure, including Solana RPC providers, AI model providers, and the Solana blockchain itself. SeekerBud is not affiliated with and is not responsible for such third parties. All third-party services that may access user data are contractually obligated to comply with the Solana dApp Store Publisher Policy and applicable privacy and security requirements. Your use of the Solana blockchain and any Solana Mobile device is additionally governed by their respective terms and policies.',
  },
  {
    title: 'Solana Mobile Disclaimer',
    body: 'SeekerBud is an independent application and is not offered by, affiliated with, sponsored by, or endorsed by Solana Mobile Inc., Solana Labs, the Solana Foundation, or any of their affiliates (collectively, the "Solana Mobile Parties"). The Solana Mobile Parties are not parties to these Terms and, to the maximum extent permitted by law, have no responsibility or liability to you in connection with SeekerBud, its content, or your use of it. The Solana blockchain and Solana Mobile devices are governed by their own terms and policies, which are provided by the respective Solana Mobile Parties.',
  },
  {
    title: 'Disclaimers and Limitation of Liability',
    body: 'The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law, SeekerBud shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or digital assets, arising from or related to your use of the Service. Our aggregate liability shall not exceed the fees you actually paid for the Service in the three (3) months preceding the claim.',
  },
  {
    title: 'Changes to These Terms',
    body: 'We may update these Terms from time to time. Material changes will be communicated through the Service or by other reasonable means. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.',
  },
  {
    title: 'Governing Law',
    body: 'These Terms are governed by the laws applicable to the jurisdiction in which the operator of SeekerBud is established, without regard to conflict-of-law principles. Any disputes shall be resolved in the competent courts of that jurisdiction, subject to any mandatory consumer protections available to you under applicable law.',
  },
  {
    title: 'Contact',
    body: 'Questions about these Terms may be directed to Ayeni Faith at haryokrystal@gmail.com.',
  },
]

const PRIVACY: Section[] = [
  {
    title: 'Overview',
    body: 'This Privacy Policy explains what information SeekerBud (operated by Ayeni Faith) collects, how it is used, and the choices you have. SeekerBud is a non-custodial application built on the Solana blockchain. We are designed to minimize the collection of personal information.',
  },
  {
    title: 'Information We Collect',
    body: 'We collect only what is needed to operate the Service: (a) your Solana wallet address (public key) and authorization tokens, stored locally on your device and used to connect to your wallet; (b) your display name if you choose to provide one; (c) basic technical data such as app version, device type, and crash diagnostics to keep the Service working; and (d) the messages you send to SeekerBud, which are transmitted to our AI provider solely to generate a response and are not stored by us. SeekerBud does not collect, store, or transmit your private keys, seed phrases, or recovery material.',
  },
  {
    title: 'Blockchain Data',
    body: 'Your wallet address and transaction history are public data recorded on the Solana blockchain. Anyone, including us, can view them through public explorers. We may access this public data to provide features such as balance and activity summaries. Information that is public on-chain is not "personal information" under this policy and is not controlled by SeekerBud.',
  },
  {
    title: 'How We Use Information',
    body: 'We use the information we collect to: provide and improve the Service; process per-message payments through the x402 protocol; respond to your requests; diagnose technical issues; and maintain the security and integrity of the Service.',
  },
  {
    title: 'Local Storage',
    body: 'Your wallet authorization and preferences are stored locally on your device (for example, in the app\'s secure storage). You can clear this data by uninstalling the app or using in-app settings. Clearing it does not affect assets on-chain, which are controlled by your keys.',
  },
  {
    title: 'Server-Side Data and Retention',
    body: 'The only information we keep on our servers is short-lived usage accounting: daily spend counters keyed by wallet address and date, used to enforce your per-message payment budget. These records expire automatically within 72 hours. We do not maintain accounts, and we do not store your chat history, messages, or any content you ask SeekerBud about.',
  },
  {
    title: 'Sharing of Information',
    body: 'We do not sell your personal information. We share information only (a) with service providers who help operate the Service (such as hosting, RPC, and AI infrastructure providers), under contractual obligations of confidentiality and compliance with the Solana dApp Store Publisher Policy; (b) where required by law or valid legal process; or (c) to protect the rights, property, or safety of SeekerBud, our users, or the public.',
  },
  {
    title: 'Security',
    body: 'Because your keys never leave your device, SeekerBud cannot be the target of credential theft in the traditional sense. We apply industry-standard safeguards to protect the data we do process, including encryption in transit and access controls. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
  },
  {
    title: 'Your Choices and Rights',
    body: 'Depending on your jurisdiction, you may have rights to access, correct, or delete personal information we hold about you, and to object to certain processing. You can exercise these rights by emailing haryokrystal@gmail.com. You can also limit the data we see by using a new or separate wallet address.',
  },
  {
    title: 'Account and Data Deletion',
    body: 'SeekerBud does not create accounts. To delete your data: (a) in the app, clear your stored data or uninstall the app to remove local authorization and preferences; and (b) any server-side spend counters tied to your wallet address expire automatically within 72 hours. If you believe any personal information should be deleted sooner, email haryokrystal@gmail.com and we will remove it within a reasonable time, except where we have lawful reasons (such as regulatory requirements or fraud prevention) to retain it.',
  },
  {
    title: 'Children',
    body: 'The Service is not directed to children under the age of 13 (or the applicable age of consent in your jurisdiction). We do not knowingly collect information from children and will delete any such information we become aware of. We do not collect data from minors without the consent of a parent or guardian.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Material changes will be communicated through the Service or by other reasonable means. Your continued use of the Service constitutes acceptance of the updated policy.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, contact Ayeni Faith at haryokrystal@gmail.com.',
  },
]

export function LegalPage({
  kind,
}: {
  kind: 'terms' | 'privacy'
}) {
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'
  const updated = 'Last updated: August 2026'
  const items = kind === 'terms' ? TERMS : PRIVACY

  return (
    <>
      <nav className="nav">
        <div className="wrap navInner">
          <Link to="/" className="brand">
            SeekerBud
          </Link>
          <Link to="/" className="btn btnSmall">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="wrap legal">
        <header className="legalHead">
          <span className="eyebrow">{updated}</span>
          <h1>{title}</h1>
        </header>
        <Sections items={items} />
      </main>

      <footer className="footer">
        <div className="wrap footerInner">
          <Link to="/" className="footerBrand">
            SeekerBud
          </Link>
          <span>© {new Date().getFullYear()} · Built on Solana</span>
          <span>
            <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </>
  )
}
