import { render } from '@testing-library/react';
import { App } from '../example';

describe('Example app', () => {
  jest.useFakeTimers();
  it('should remember cached values', () => {
    const { getByText } = render(<App />);
  });
});
