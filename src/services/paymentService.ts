
export type PaymentProvider = 'bkash' | 'nagad';

export interface PaymentSimulationResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  error?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const PaymentService = {
  async initiatePayment(provider: PaymentProvider, amount: number): Promise<PaymentSimulationResponse> {
    console.log(`Initiating ${provider} payment for ৳${amount}`);
    
    // Simulate initial handshake
    await sleep(1500);

    // 90% success rate for simulation
    const isError = Math.random() < 0.1;

    if (isError) {
      return {
        success: false,
        message: 'Transaction failed during initialization.',
        error: 'GATEWAY_TIMEOUT'
      };
    }

    switch (provider) {
      case 'bkash':
        return {
          success: true,
          transactionId: `BK-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          message: 'bKash OTP simulation successful'
        };
      case 'nagad':
        return {
          success: true,
          transactionId: `NG-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          message: 'Nagad PIN simulation successful'
        };
      default:
        return { success: false, message: 'Invalid provider' };
    }
  }
};
