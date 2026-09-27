# Version 4.6.60

Release Date: 2026-09-27

### Fixed
- Hub Profile Back-Navigation Canonical Restoration: Resolved the navigation regression where entering Profile from the Hub broke Android hardware back and predictive swipe-back gesture unwinding.
- De-coupled Sheet and Domain Priority: Removed artificial root-level back interception in AccountCard, ensuring active sheets (Avatar Picker, Account Details, Danger Zone) cleanly close without altering route history, while Profile root delegates to canonical BackDispatcher pop.
- Elimination of Forward Push on Back: Corrected goBack in HubSettings and pageProps to cleanly pop the navigation history stack rather than pushing duplicate Home routes, eliminating navigation ping-pong loops and preserving cross-app domain containment.
