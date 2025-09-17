import React from 'react';

const examples = {
  privacyPolicy: `
1. Information We Collect
We collect information you provide directly to us, such as when you create an account, and information we collect automatically, such as your IP address and browsing behavior. This information is used to improve our services.

2. Use of Information
We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect our company and our users. We will not share your personal information with third parties without your consent, except as required by law.

3. Data Security
We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet is 100% secure.
  `.trim(),
  rentalAgreement: `
1. Term of Lease
The term of this lease is for a period of 12 months, beginning on January 1, 2025, and ending on December 31, 2025. This lease shall automatically renew on a month-to-month basis unless either party gives 30 days' written notice of termination.

2. Rent
Tenant agrees to pay Landlord the sum of $1,500 per month, due on the 1st day of each month. A late fee of $50 will be assessed for any rent not received by the 5th day of the month.

3. Security Deposit
Upon execution of this lease, Tenant shall deposit with Landlord the sum of $1,500 as security for the faithful performance of the terms of this lease. The security deposit will be returned to the Tenant within 30 days after the termination of this lease, less any deductions for damages or unpaid rent.
  `.trim(),
};

interface ExampleContractsProps {
  onSelect: (text: string) => void;
}

export const ExampleContracts: React.FC<ExampleContractsProps> = ({ onSelect }) => {
  return (
    <div className="mt-4 text-center">
      <p className="text-sm text-muted-foreground mb-3">Don't have a contract? Try an example:</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onSelect(examples.privacyPolicy)}
          className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary/50 border border-border rounded-full hover:bg-secondary transition-all duration-200"
        >
          Privacy Policy
        </button>
        <button
          onClick={() => onSelect(examples.rentalAgreement)}
          className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary/50 border border-border rounded-full hover:bg-secondary transition-all duration-200"
        >
          Rental Agreement
        </button>
      </div>
    </div>
  );
};
