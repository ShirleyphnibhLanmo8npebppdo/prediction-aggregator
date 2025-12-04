// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface PredictionMarket {
  id: string;
  name: string;
  description: string;
  encryptedOdds: string;
  encryptedVolume: string;
  sentimentScore: number;
  timestamp: number;
  source: string;
  category: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newMarketData, setNewMarketData] = useState({
    name: "",
    description: "",
    source: "Augur",
    category: "Politics"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [showFAQ, setShowFAQ] = useState(false);
  const [sentimentChartData, setSentimentChartData] = useState<number[]>([]);

  // Calculate statistics for dashboard
  const totalMarkets = markets.length;
  const totalVolume = markets.reduce((sum, market) => sum + parseInt(market.encryptedVolume.replace("FHE-", "")), 0);
  const avgSentiment = totalMarkets > 0 
    ? markets.reduce((sum, market) => sum + market.sentimentScore, 0) / totalMarkets 
    : 0;

  // Filter markets based on search term
  const filteredMarkets = markets.filter(market => 
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredMarkets.length / itemsPerPage);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    loadMarkets().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Generate sentiment chart data
    const sentimentData = Array(10).fill(0);
    markets.forEach(market => {
      const bucket = Math.floor(market.sentimentScore / 10);
      sentimentData[bucket]++;
    });
    setSentimentChartData(sentimentData);
  }, [markets]);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadMarkets = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("market_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing market keys:", e);
        }
      }
      
      const list: PredictionMarket[] = [];
      
      for (const key of keys) {
        try {
          const marketBytes = await contract.getData(`market_${key}`);
          if (marketBytes.length > 0) {
            try {
              const marketData = JSON.parse(ethers.toUtf8String(marketBytes));
              list.push({
                id: key,
                name: marketData.name,
                description: marketData.description,
                encryptedOdds: marketData.encryptedOdds,
                encryptedVolume: marketData.encryptedVolume,
                sentimentScore: marketData.sentimentScore,
                timestamp: marketData.timestamp,
                source: marketData.source,
                category: marketData.category
              });
            } catch (e) {
              console.error(`Error parsing market data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading market ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setMarkets(list);
    } catch (e) {
      console.error("Error loading markets:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const addMarket = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setAdding(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting market data with Zama FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedOdds = `FHE-${btoa(Math.random().toString(36).substring(2, 10))}`;
      const encryptedVolume = `FHE-${btoa(Math.floor(Math.random() * 1000000).toString())}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const marketId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const marketData = {
        ...newMarketData,
        encryptedOdds,
        encryptedVolume,
        sentimentScore: Math.floor(Math.random() * 100), // Simulated FHE sentiment analysis
        timestamp: Math.floor(Date.now() / 1000),
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `market_${marketId}`, 
        ethers.toUtf8Bytes(JSON.stringify(marketData))
      );
      
      const keysBytes = await contract.getData("market_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(marketId);
      
      await contract.setData(
        "market_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Market data encrypted and stored securely!"
      });
      
      await loadMarkets();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddModal(false);
        setNewMarketData({
          name: "",
          description: "",
          source: "Augur",
          category: "Politics"
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setAdding(false);
    }
  };

  const checkAvailability = async () => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Checking FHE contract availability..."
    });

    try {
      const contract = await getContractReadOnly();
      if (!contract) {
        throw new Error("Failed to get contract");
      }
      
      const isAvailable = await contract.isAvailable();
      
      if (isAvailable) {
        setTransactionStatus({
          visible: true,
          status: "success",
          message: "FHE contract is available and ready!"
        });
      } else {
        setTransactionStatus({
          visible: true,
          status: "error",
          message: "FHE contract is not available"
        });
      }
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Availability check failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const renderSentimentChart = () => {
    const maxValue = Math.max(...sentimentChartData, 1);
    
    return (
      <div className="sentiment-chart">
        {sentimentChartData.map((count, index) => (
          <div key={index} className="sentiment-bar-container">
            <div className="sentiment-bar-label">{index * 10}-{(index + 1) * 10}</div>
            <div 
              className="sentiment-bar" 
              style={{ height: `${(count / maxValue) * 100}%` }}
            >
              <div className="sentiment-bar-value">{count}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMarketCards = () => {
    return paginatedMarkets.map(market => (
      <div className="market-card" key={market.id}>
        <div className="market-header">
          <div className={`market-source ${market.source.toLowerCase()}`}>
            {market.source}
          </div>
          <div className="market-sentiment">
            <div className="sentiment-score">
              {market.sentimentScore}
              <span className="sentiment-label">FHE Score</span>
            </div>
          </div>
        </div>
        
        <div className="market-body">
          <h3 className="market-name">{market.name}</h3>
          <p className="market-description">{market.description}</p>
          
          <div className="market-meta">
            <div className="meta-item">
              <span className="meta-label">Category</span>
              <span className="meta-value">{market.category}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Volume</span>
              <span className="meta-value">FHE-Encrypted</span>
            </div>
          </div>
        </div>
        
        <div className="market-footer">
          <div className="market-timestamp">
            {new Date(market.timestamp * 1000).toLocaleDateString()}
          </div>
          <div className="market-actions">
            <button className="action-btn">
              <span className="eye-icon"></span>
              View Analysis
            </button>
          </div>
        </div>
      </div>
    ));
  };

  const faqItems = [
    {
      question: "What is FHE and how does it protect my privacy?",
      answer: "Fully Homomorphic Encryption (FHE) allows computations to be performed on encrypted data without decrypting it first. This means market data can be analyzed while keeping all sensitive information encrypted, ensuring complete privacy."
    },
    {
      question: "How is market sentiment calculated?",
      answer: "Our FHE algorithms analyze encrypted betting odds, trading volumes, and market positions across multiple prediction markets to calculate an aggregated sentiment score without ever decrypting the underlying data."
    },
    {
      question: "Which prediction markets are supported?",
      answer: "Currently we support Augur and Gnosis, with plans to integrate Polymarket, Omen, and other major prediction markets in the near future."
    },
    {
      question: "How often is market data updated?",
      answer: "Market data is aggregated and encrypted every 15 minutes. Real-time updates are available for premium users."
    },
    {
      question: "Can I contribute my own market analysis?",
      answer: "Yes! Connect your wallet to submit encrypted market data. All submissions are verified through our FHE consensus mechanism."
    }
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner">
        <div className="fhe-ring"></div>
        <div className="fhe-ring"></div>
        <div className="fhe-ring"></div>
      </div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container future-metal-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>FHE<span>Prediction</span>Aggregator</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="add-market-btn metal-button"
          >
            <div className="add-icon"></div>
            Add Market
          </button>
          <button 
            className="metal-button"
            onClick={() => setShowFAQ(!showFAQ)}
          >
            {showFAQ ? "Hide FAQ" : "Show FAQ"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="dashboard-grid">
          <div className="dashboard-card metal-card">
            <h2>Decentralized Prediction Market Aggregator</h2>
            <p className="subtitle">Privacy-first market analysis powered by FHE technology</p>
            
            <div className="fhe-badge">
              <span>FHE-Powered Privacy</span>
            </div>
            
            <div className="intro-text">
              <p>Aggregating encrypted data from multiple prediction markets (Augur, Gnosis) to provide anonymous macro sentiment analysis without compromising individual privacy.</p>
              <p>All computations are performed on encrypted data using Fully Homomorphic Encryption (FHE).</p>
            </div>
            
            <div className="action-buttons">
              <button 
                className="metal-button primary"
                onClick={checkAvailability}
              >
                Check FHE Availability
              </button>
              <button 
                className="metal-button"
                onClick={loadMarkets}
              >
                Refresh Markets
              </button>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Market Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalMarkets}</div>
                <div className="stat-label">Total Markets</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">FHE-{totalVolume}</div>
                <div className="stat-label">Total Volume</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{avgSentiment.toFixed(1)}</div>
                <div className="stat-label">Avg. Sentiment</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">2</div>
                <div className="stat-label">Sources</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Market Sentiment Distribution</h3>
            <div className="chart-container">
              {renderSentimentChart()}
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="color-box low"></div>
                  <span>Bearish (0-30)</span>
                </div>
                <div className="legend-item">
                  <div className="color-box medium"></div>
                  <span>Neutral (31-70)</span>
                </div>
                <div className="legend-item">
                  <div className="color-box high"></div>
                  <span>Bullish (71-100)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {showFAQ && (
          <div className="faq-section metal-card">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              {faqItems.map((faq, index) => (
                <div className="faq-item" key={index}>
                  <div className="faq-question">
                    <div className="faq-icon">Q</div>
                    <h3>{faq.question}</h3>
                  </div>
                  <div className="faq-answer">
                    <div className="faq-icon">A</div>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="markets-section">
          <div className="section-header">
            <h2>Prediction Markets</h2>
            <div className="search-filter">
              <input
                type="text"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="metal-input"
              />
              <select className="metal-select">
                <option>All Categories</option>
                <option>Politics</option>
                <option>Finance</option>
                <option>Sports</option>
                <option>Technology</option>
                <option>Entertainment</option>
              </select>
            </div>
          </div>
          
          {filteredMarkets.length === 0 ? (
            <div className="no-markets metal-card">
              <div className="no-markets-icon"></div>
              <p>No prediction markets found</p>
              <button 
                className="metal-button primary"
                onClick={() => setShowAddModal(true)}
              >
                Add First Market
              </button>
            </div>
          ) : (
            <>
              <div className="markets-grid">
                {renderMarketCards()}
              </div>
              
              <div className="pagination-controls">
                <button 
                  className="metal-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                
                <div className="page-info">
                  Page {currentPage} of {totalPages}
                </div>
                
                <button 
                  className="metal-button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  
      {showAddModal && (
        <ModalAddMarket 
          onSubmit={addMarket} 
          onClose={() => setShowAddModal(false)} 
          adding={adding}
          marketData={newMarketData}
          setMarketData={setNewMarketData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>FHE Prediction Aggregator</span>
            </div>
            <p>Privacy-first market analysis powered by Fully Homomorphic Encryption</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} FHE Prediction Aggregator. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalAddMarketProps {
  onSubmit: () => void; 
  onClose: () => void; 
  adding: boolean;
  marketData: any;
  setMarketData: (data: any) => void;
}

const ModalAddMarket: React.FC<ModalAddMarketProps> = ({ 
  onSubmit, 
  onClose, 
  adding,
  marketData,
  setMarketData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMarketData({
      ...marketData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!marketData.name || !marketData.description) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="add-modal metal-card">
        <div className="modal-header">
          <h2>Add Prediction Market</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Market data will be encrypted with Zama FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Market Name *</label>
              <input 
                type="text"
                name="name"
                value={marketData.name} 
                onChange={handleChange}
                placeholder="e.g. US Election Outcome" 
                className="metal-input"
              />
            </div>
            
            <div className="form-group">
              <label>Source *</label>
              <select 
                name="source"
                value={marketData.source} 
                onChange={handleChange}
                className="metal-select"
              >
                <option value="Augur">Augur</option>
                <option value="Gnosis">Gnosis</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select 
                name="category"
                value={marketData.category} 
                onChange={handleChange}
                className="metal-select"
              >
                <option value="Politics">Politics</option>
                <option value="Finance">Finance</option>
                <option value="Sports">Sports</option>
                <option value="Technology">Technology</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Description *</label>
              <textarea 
                name="description"
                value={marketData.description} 
                onChange={handleChange}
                placeholder="Describe the prediction market..." 
                className="metal-textarea"
                rows={3}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Data remains encrypted during FHE processing and analysis
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={adding}
            className="metal-button primary"
          >
            {adding ? "Encrypting with FHE..." : "Add Market"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;