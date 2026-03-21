import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('--- React Error Boundary Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff0000', backgroundColor: '#000', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong (React Error Boundary)</h1>
          <p>{this.state.error?.toString()}</p>
          <pre>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()}>Try Refreshing</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
