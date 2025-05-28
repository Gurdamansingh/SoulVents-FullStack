import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Calendar, Download, CreditCard } from 'lucide-react';
import type { ExpertData } from '../../types/expert';
import { useAuth } from '../../context/AuthContext';

interface FinanceProps {
  expertData: ExpertData;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const Finance = ({ expertData }: FinanceProps) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchWithdrawalHistory();
    }
  }, [token]);

  const fetchWithdrawalHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/withdrawals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal history');
      }
      
      const data = await response.json();
      setWithdrawalHistory(data);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseInt(withdrawalAmount) })
      });

      if (!response.ok) {
        throw new Error('Failed to submit withdrawal request');
      }

      alert('Withdrawal request submitted successfully');
      setWithdrawalAmount('');
      fetchWithdrawalHistory();
    } catch (error) {
      alert('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Net Earnings</h2>
            <p className="text-3xl font-bold text-rose-500 mt-2">
              {
             (
              (expertData.total_earnings || 0) - 
              ((expertData.total_earnings || 0) * (expertData.commission_rate || 10)) / 100
            ).toFixed(2)}
            </p>
          </div>
          <IndianRupee className="h-12 w-12 text-rose-500" />
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Request Credit Withdrawal</h2>
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (in credits)
            </label>
            <input
              type="number"
              min="1"
              max={expertData.credits || 0}
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !withdrawalAmount || Number(withdrawalAmount) > (expertData.credits || 0)}
            className={`w-full bg-rose-500 text-white py-2 rounded-md hover:bg-rose-600 ${
              isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Withdrawal History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalHistory.map((request) => (
                <tr key={request.id} className="border-b">
                  <td className="py-3 px-4">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{request.amount} C</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      request.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
              {withdrawalHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No withdrawal history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Commission Details</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Commission Rate:</span>
            <span className="font-medium">{expertData.commission_rate || 10}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Total Earnings:</span>
            <span className="font-medium">{(expertData.total_earnings).toFixed(2) || 0} C</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Platform Fee:</span>
            <span className="font-medium">
            {(((expertData.total_earnings || 0) * (expertData.commission_rate || 10)) / 100).toFixed(2)} C
            </span>
          </div>
          <div className="flex justify-between items-center font-semibold">
            <span>Net Earnings:</span>
            <span className="flex items-center">
  <IndianRupee className="mr-1" />
  {(
    (expertData.total_earnings || 0) - 
    ((expertData.total_earnings || 0) * (expertData.commission_rate || 10)) / 100
  ).toFixed(2)}
</span>
          </div>
        </div>
      </div>

      {/* Payment Reports */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payment Reports</h2>
          <button className="flex items-center text-rose-500 hover:text-rose-600">
            <Download className="h-5 w-5 mr-2" />
            Download Report
          </button>
        </div>
        <div className="space-y-4">
          {expertData.payment_history?.map((payment) => (
            <div key={payment.month} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{payment.month}</p>
                <p className="text-sm text-gray-500">{payment.sessions} sessions</p>
              </div>
              <span className="font-medium">{payment.amount} C</span>
            </div>
          )) || (
            <div className="text-center text-gray-500">No payment history available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Finance;