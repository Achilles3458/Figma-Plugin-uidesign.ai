import React, { useState } from 'react';
import { validationConstants } from '../../constants';
import { signup, login } from '../../services';
import { isValidEmail, isValidPassword } from '../../utils';

const SignupPage = ({ onLogin, onVerified }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyDown = (event: any) => {
    if (event.keyCode === 13 && isValid()) {
      handleSignup();
    }
  };

  const isValid = () => {
    if (
      email.length <= 0 ||
      !isValidEmail(email) ||
      password.length < validationConstants.MIN_PASSWORD_LENGTH ||
      !isValidPassword(password)
    )
      return false;
    return true;
  };

  const handleSignup = async () => {
    if (processing) return;
    setProcessing(true);

    setErrorMsg('');
    try {
      const params = {
        username: email,
        email,
        confirm_email: email,
        password,
        confirm_password: password,
      };
      const resp_signup = await signup(params);
      if (!resp_signup || resp_signup.error) {
        setErrorMsg(resp_signup.error);
      } else {
        const resp_login = await login(params);
        if (!resp_login || resp_login.error) {
          setErrorMsg(resp_login.error);
        } else {
          parent.postMessage({ pluginMessage: { type: 'VERIFIED', token: resp_login } }, '*');
          onVerified(resp_login);
        }
      }
    } catch (e) {
      setErrorMsg('Something wrong, could not register');
    }

    setProcessing(false);
  };

  return (
    <div className="page">
      <span className="page-title">Sign Up</span>
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
          <span className="input-hint">At least 8 characters, lower case, upper case, and symbols.</span>
        </div>
      </div>
      {errorMsg.length > 0 ? <span className="error-msg">{errorMsg}</span> : ''}
      <div className="link" onClick={onLogin}>
        Login
      </div>
      <button
        className={`btn-submit ${!isValid() ? 'disabled' : ''} ${processing ? 'processing' : ''}`}
        disabled={!isValid()}
        onClick={handleSignup}
      >
        {processing ? 'Creating Account...' : 'Create Account'}
      </button>
    </div>
  );
};

export default SignupPage;
