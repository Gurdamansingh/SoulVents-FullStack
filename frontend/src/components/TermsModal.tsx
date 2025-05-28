import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Shield, Lock } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  type: 'chat' | 'call';
}

const TermsModal = ({ isOpen, onClose, onAccept, type }: TermsModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Enable scrolling when modal is opened
    if (isOpen && modalRef.current) {
      modalRef.current.style.maxHeight = '90vh';
      modalRef.current.style.overflowY = 'auto';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-2xl w-full mx-auto my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pt-1 z-10">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-rose-500 mr-2" />
            <h2 className="text-2xl font-bold">Terms & Conditions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="prose max-w-none mb-6">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-rose-800 font-medium mb-1">Emergency Notice</h3>
                <p className="text-rose-700 text-sm">
                  If you're experiencing a medical emergency or having thoughts of self-harm:
                </p>
                <ul className="text-rose-700 text-sm mt-2 mb-0">
                  <li>Call your local emergency services immediately</li>
                  <li>Contact a suicide prevention hotline</li>
                  <li>Visit the nearest emergency room</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">
            {type === 'chat' ? 'Chat Session Terms' : 'Video Call Session Terms'}
          </h3>

          <div className="space-y-4">
            <section>
              <h4 className="font-medium mb-2">1. Purpose and Scope</h4>
              <p className="text-gray-600">
                SoulVents is designed to provide users with a safe space to express their emotions and thoughts.
                It also helps in gaining professional therapy, counseling, or crisis intervention services.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-2">2. User Eligibility and Conduct</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>You must be at least 10 years old to use this service</li>
                <li>Do not share personal information that could compromise your privacy</li>
                <li>Maintain respectful and appropriate communication</li>
                <li>Do not engage in harassment, bullying, or discrimination</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-2">3. Session Guidelines</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Sessions are charged at the expert's stated rate per minute</li>
                <li>You must have sufficient credits in your account</li>
                <li>Do not record or share session content</li>
                <li>Maintain professional boundaries with experts</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-2">4. Credit System</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Credits are deducted at the expert's rate per minute</li>
                <li>Sessions will automatically end when your credits run out</li>
                <li>You will receive a warning when your credits are running low</li>
                <li>No refunds are provided for partially used sessions</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-2">5. Privacy and Confidentiality</h4>
              <div className="flex items-start space-x-2">
                <Lock className="h-5 w-5 text-gray-500 mt-1" />
                <p className="text-gray-600">
                  While we implement robust security measures, complete confidentiality cannot be guaranteed.
                  Exercise discretion in sharing sensitive information.
                </p>
              </div>
            </section>

            <section>
              <h4 className="font-medium mb-2">6. Disclaimer</h4>
              <p className="text-gray-600">
                This service is not a substitute for emergency medical services. SoulVents and its experts
                are not liable for any emotional distress or consequences resulting from the use of our platform.
              </p>
            </section>
          </div>
        </div>

        <div className="flex justify-end space-x-4 sticky bottom-0 bg-white pt-4 pb-1 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
          >
            I Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;