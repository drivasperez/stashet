import React from 'react';
import { render } from '@testing-library/react';
import { App } from '../example/components';

describe('Example app', () => {
  jest.useFakeTimers();
  it('should remember cached values', () => {
    const { getByText } = render(<App />);
  });
});
