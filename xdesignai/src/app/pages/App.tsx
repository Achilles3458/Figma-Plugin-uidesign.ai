import React, { useEffect, useState } from 'react';
import SignupPage from '../pages/Signup';
import LoginPage from '../pages/Login';
import MainPage from '../pages/Main';
import { refreshToken } from '../services';
import { PAGES } from '../constants';
import './App.scss';

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.SIGNUP);
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [token, setToken] = useState<any>({});
  const [loaded, setLoaded] = useState(false);

  const handleAfterVerify = (token: any) => {
    setToken(token);
    setSubscribed(token.is_subscribed || token.is_admin);
    setCurrentPage(PAGES.MAIN);
  };

  useEffect(() => {
    window.onmessage = async (event) => {
      const { type, token, settings } = event.data.pluginMessage;
      if (type === 'INIT_REQUEST') {
        setSettings(settings || {});

        if (token && token.refresh_token) {
          const params = {
            refresh_token: token.refresh_token,
          };
          const resp = await refreshToken(params);
          if (resp && !resp.error) {
            setToken(resp);
            parent.postMessage({ pluginMessage: { type: 'VERIFIED', token: resp } }, '*');
            setSubscribed(resp.is_subscribed || resp.is_admin);
            setCurrentPage(PAGES.MAIN);
          }
        }
        setLoaded(true);
      }
    };
    parent.postMessage({ pluginMessage: { type: 'INIT_REQUEST' } }, '*');
  }, []);

  if (!loaded) {
    return (
      <div className="App">
        <div className="lds-container">
          <div className="lds-spinner">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="lds-text">Logging in...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="App">
      {
        {
          [PAGES.SIGNUP]: <SignupPage onLogin={() => setCurrentPage(PAGES.LOGIN)} onVerified={handleAfterVerify} />,
          [PAGES.LOGIN]: <LoginPage onSignup={() => setCurrentPage(PAGES.SIGNUP)} onVerified={handleAfterVerify} />,
          [PAGES.MAIN]: (
            <MainPage
              appSettings={settings}
              token={token}
              subscribed={subscribed}
              onSignOut={() => setCurrentPage(PAGES.LOGIN)}
            />
          ),
        }[currentPage]
      }
    </div>
  );
}

export default App;
