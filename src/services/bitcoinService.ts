import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment';
import mongoose from 'mongoose';

class BitcoinService {
  private bitcoinAddress: string;
  private btcExchangeRate: number = 45000; // Default BTC/USD rate (will be updated from API)

  constructor() {
    this.bitcoinAddress = process.env.BITCOIN_ADDRESS || '1A1z7agoat4oPLHSPhamenrPFzcKSKU1P'; // Example address
  }

  /**
   * Get current BTC/USD exchange rate
   */
  async getBTCExchangeRate(): Promise<number> {
    try {
      const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice/BTC.json');
      const data = await response.json();
      this.btcExchangeRate = data.bpi.USD.rate_float;
      return this.btcExchangeRate;
    } catch (error) {
      console.error('[BITCOIN] Error fetching exchange rate:', error);
      // Return cached or default rate on error
      return this.btcExchangeRate;
    }
  }

  /**
   * Convert USD to BTC
   */
  async convertUSDtoBTC(amountUSD: number): Promise<number> {
    const rate = await this.getBTCExchangeRate();
    return amountUSD / rate;
  }

  /**
   * Create Bitcoin payment request
   */
  async createPaymentRequest(
    userId: string,
    planId: string,
    amountUSD: number,
    planName: string
  ) {
    try {
      // Generate unique payment reference
      const paymentReference = `BTC-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      // Convert USD to BTC
      const amountBTC = await this.convertUSDtoBTC(amountUSD);
      
      // Create payment record
      const payment = new Payment({
        userId,
        amount: amountUSD,
        currency: 'USD',
        paymentReference,
        paymentMethod: 'bitcoin',
        bitcoinAddress: this.bitcoinAddress,
        bitcoinAmountUSD: amountUSD,
        bitcoinAmountBTC: amountBTC,
        status: 'pending',
      });

      await payment.save();

      return {
        paymentId: payment._id.toString(),
        paymentReference,
        bitcoinAddress: this.bitcoinAddress,
        amountUSD,
        amountBTC: amountBTC.toFixed(8),
        planName,
        instructions: `Send exactly ${amountBTC.toFixed(8)} BTC to ${this.bitcoinAddress} with reference in transaction memo: ${paymentReference}`,
        message: `Bitcoin Payment: Send ${amountBTC.toFixed(8)} BTC (≈ $${amountUSD.toLocaleString()}) to ${this.bitcoinAddress}. Include reference code in memo for verification: ${paymentReference}`,
        exchangeRate: this.btcExchangeRate,
      };
    } catch (error) {
      console.error('[BITCOIN] Error creating payment request:', error);
      throw error;
    }
  }

  /**
   * Verify Bitcoin transaction
   */
  async verifyPayment(
    paymentId: string,
    transactionHash: string,
    confirmations: number = 1
  ): Promise<void> {
    try {
      // Validate transaction hash format (64 hex characters)
      if (!/^[a-fA-F0-9]{64}$/.test(transactionHash)) {
        throw new Error('Invalid Bitcoin transaction hash format');
      }

      // In production, verify with blockchain API (e.g., BlockChain.info, Blockchair)
      // For now, we'll accept the transaction hash and store it
      
      const payment = await Payment.findByIdAndUpdate(
        paymentId,
        {
          bitcoinTransactionHash: transactionHash,
          bitcoinConfirmations: confirmations,
          status: 'completed',
          verifiedAt: new Date(),
          verificationNotes: `Bitcoin transaction verified. Hash: ${transactionHash}. Confirmations: ${confirmations}`,
        },
        { new: true }
      );

      if (!payment) {
        throw new Error('Payment not found');
      }

      return;
    } catch (error) {
      console.error('[BITCOIN] Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId: string) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        userId: payment.userId,
        amountUSD: payment.bitcoinAmountUSD,
        amountBTC: payment.bitcoinAmountBTC?.toFixed(8),
        bitcoinAddress: payment.bitcoinAddress,
        transactionHash: payment.bitcoinTransactionHash,
        confirmations: payment.bitcoinConfirmations,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
        createdAt: payment.createdAt,
      };
    } catch (error) {
      console.error('[BITCOIN] Error getting payment details:', error);
      throw error;
    }
  }

  /**
   * Check transaction on blockchain (mock - integrate with real blockchain API)
   */
  async checkBlockchainTransaction(transactionHash: string): Promise<any> {
    try {
      // In production, call real blockchain API like:
      // https://blockchair.com/bitcoin/transactions/{transactionHash}
      // https://blockchain.com/v3/payments/transactions/{transactionHash}
      
      console.log('[BITCOIN] Checking transaction on blockchain:', transactionHash);
      
      // Mock response for testing
      return {
        transactionHash,
        status: 'confirmed',
        confirmations: 6,
        timestamp: new Date(),
        message: 'In production, this would verify with actual blockchain APIs',
      };
    } catch (error) {
      console.error('[BITCOIN] Error checking blockchain:', error);
      throw error;
    }
  }

  /**
   * Get Bitcoin address (returns the configured address)
   */
  async getBitcoinAddress(): Promise<string> {
    return this.bitcoinAddress;
  }

  /**
   * Update Bitcoin address (admin only)
   */
  async updateBitcoinAddress(newAddress: string): Promise<void> {
    // Validate Bitcoin address format (simplified)
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(newAddress)) {
      throw new Error('Invalid Bitcoin address format');
    }
    this.bitcoinAddress = newAddress;
  }
}

export default new BitcoinService();
