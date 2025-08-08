import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Hello } from '@/components/Hello';

describe('Hello component', () => {
  it('renders the given name', () => {
    render(<Hello name="Alessandro" />);
    expect(screen.getByText('Hello, Alessandro!')).toBeInTheDocument();
  });
});
