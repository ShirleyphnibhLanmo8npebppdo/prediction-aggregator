# Decentralized Prediction Market Aggregator

A privacy-preserving decentralized aggregator for prediction markets, enabling users to gain macro-level insights into market sentiment without exposing individual positions or strategies. By integrating Full Homomorphic Encryption (FHE), the platform performs computations directly on encrypted data, ensuring that sensitive market information remains confidential while still providing actionable analytics.

## Project Motivation

Prediction markets are powerful tools for forecasting events and trends, but aggregating data from multiple markets faces significant challenges:

* **Privacy Concerns:** Individual bets or stakes reveal trading strategies and sensitive opinions.
* **Data Fragmentation:** Information is spread across multiple platforms like Augur and Gnosis, making comprehensive insights difficult.
* **Trust Issues:** Market participants may fear manipulation or misuse of their data.
* **Analysis Limitations:** Traditional aggregation requires decrypting sensitive market data, introducing security risks.

This project addresses these problems using FHE to perform encrypted aggregation, producing insights without ever exposing raw user data.

## Key Features

### Market Data Aggregation

* **Multi-Market Integration:** Connects to several prediction markets via APIs.
* **Encrypted Odds & Positions:** Individual bets remain encrypted at all stages.
* **FHE-Based Computation:** Market trends and sentiment metrics are computed over encrypted data.
* **Anonymized Analytics:** Provides macro-level insights without revealing individual positions.

### Analytics & Visualization

* **Trend Dashboards:** Real-time aggregated sentiment metrics.
* **Probability Heatmaps:** Visual representations of likelihoods computed from encrypted inputs.
* **Market Sentiment Scores:** Derived from combined encrypted data.
* **Historical Analysis:** Compute historical trends while preserving participant privacy.

### Privacy & Security

* **Client-Side Encryption:** Market inputs are encrypted before submission to the platform.
* **Encrypted Aggregation:** All computations occur on encrypted datasets via FHE.
* **Immutable Storage:** Aggregated insights and raw encrypted data are stored on-chain for transparency.
* **Zero Exposure:** No sensitive market position is ever revealed to the platform, other participants, or third parties.

## Architecture

### Backend

* **Python Core Services:** Handles FHE computation and orchestrates encrypted aggregation.
* **Concrete Library:** Provides the homomorphic encryption engine.
* **Data API Layer:** Collects market data from multiple sources in encrypted form.
* **Worker Nodes:** Execute FHE operations efficiently, ensuring scalability.

### Smart Contracts

* **PredictionAggregator.sol:** Deployed on fhEVM-compatible networks.
* **Responsibilities:**

  * Accept encrypted market contributions.
  * Store aggregated results immutably.
  * Allow queries of aggregated, anonymized insights.

### Frontend

* **React + TypeScript:** Interactive dashboard with real-time updates.
* **Web3.js / Ethers.js:** Blockchain connectivity and encrypted transaction submission.
* **Visualization Components:** Graphs, charts, and trend lines to represent market sentiment.
* **Secure Client Interface:** Ensures encryption happens locally before data leaves the client.

## Technology Stack

### Blockchain Layer

* Solidity ^0.8.x
* fhEVM-compatible network deployment
* Smart contracts for immutable storage and aggregation
* Transparent verification of computation

### FHE & Computation

* Concrete (Python library) for homomorphic operations
* Encrypted aggregation functions for market statistics
* Efficient batch processing and real-time trend computation

### Frontend Layer

* React 18 + TypeScript
* TailwindCSS for responsive design
* Ethers.js/Web3.js for blockchain interactions
* Real-time dashboard rendering of aggregated insights

## Installation

### Prerequisites

* Node.js 18+
* Python 3.10+
* npm / yarn / pnpm
* fhEVM-compatible wallet (optional for blockchain interactions)

### Setup Steps

1. Clone repository and install dependencies:

   ```bash
   git clone <repo>
   cd <repo>
   npm install
   pip install -r requirements.txt
   ```
2. Configure API keys for market data sources (stored locally, never sent unencrypted).
3. Deploy smart contracts on the target fhEVM network.
4. Launch backend FHE service:

   ```bash
   python backend/fhe_service.py
   ```
5. Run frontend dashboard:

   ```bash
   npm run start
   ```

## Usage

* Submit encrypted market data through the client interface.
* Dashboard displays aggregated sentiment, trends, and probability metrics in real time.
* Explore historical encrypted computations for deeper insights.
* All computations happen without decrypting individual positions.

## Security Considerations

* Full Homomorphic Encryption ensures no raw market data is exposed.
* Immutable on-chain storage prevents tampering.
* Aggregation functions are verified to compute correct metrics on encrypted data.
* Client-side encryption guarantees that sensitive inputs never leave the user’s device unprotected.

## Roadmap

* **Enhanced Scalability:** Parallelized FHE computations for larger markets.
* **Mobile Dashboard:** Secure mobile-friendly interface.
* **Advanced Metrics:** Sentiment prediction models over encrypted datasets.
* **Multi-Market Expansion:** Support for additional prediction platforms.
* **DAO Governance:** Community-driven feature requests and smart contract upgrades.

## Conclusion

This decentralized prediction market aggregator demonstrates how FHE can reconcile privacy with actionable analytics. Users gain meaningful insights into market trends while remaining fully anonymous. By combining blockchain immutability with encrypted computation, the platform provides both trust and confidentiality in a decentralized environment.
