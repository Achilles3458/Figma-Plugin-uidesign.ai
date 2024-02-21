import React, { useState } from 'react';
import { login } from '../../services';
import { isValidEmail } from '../../utils';
import './index.scss';

const LoginPage = ({ onSignup, onVerified }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyDown = (event: any) => {
    if (event.keyCode === 13 && isValid()) {
      handleLogin();
    }
  };

  const isValid = () => {
    if (email.length <= 0 || !isValidEmail(email) || password.length <= 0) return false;
    return true;
  };

  const handleLogin = async () => {
    if (processing) return;
    setProcessing(true);

    setErrorMsg('');
    try {
      const params = {
        email,
        password,
      };
      const resp = await login(params);
      if (!resp || resp.error) {
        setErrorMsg(resp.error);
      } else {
        parent.postMessage({ pluginMessage: { type: 'VERIFIED', token: resp } }, '*');
        onVerified(resp);
      }
    } catch (e) {
      setErrorMsg('Something wrong, could not login');
    }

    setProcessing(false);
  };

  return (
    <div className="page">
      <span className="page-title">Log In</span>
      <div className="section">
        <span className="section-title">Email</span>
        <div className="section-content">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
      </div>
      <div className="section">
        <span className="section-title">Password</span>
        <div className="section-content">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      {errorMsg.length > 0 ? <span className="error-msg">{errorMsg}</span> : ''}
      <div className="link" onClick={onSignup}>
        Create account
      </div>
      <button
        className={`btn-submit ${!isValid() ? 'disabled' : ''} ${processing ? 'processing' : ''}`}
        disabled={!isValid()}
        onClick={handleLogin}
      >
        {processing ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
};

export default LoginPage;
