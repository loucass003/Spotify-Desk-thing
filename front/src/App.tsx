import { Router, Route, useNavigate, redirect, useLocation,  } from "@solidjs/router";
import { Login } from './components/Login';
import { Player, PlayerContextProvider } from './components/Player';
import { isLoggedIn } from "./hooks/auth";
import { ParentProps, onCleanup, onMount } from "solid-js";


export function ConnectedGuard(props: ParentProps) {
  const navigate = useNavigate();
  const location = useLocation()

  onMount(async () => {
    await checkLogged()
  });

  const checkLogged = async () => {
    const logged = await isLoggedIn();
    if (logged) {
      navigate('/');
    }
  }

  const check = setInterval(() => {
    if (location.pathname == '/login')
      checkLogged();
  }, 1000);

  onCleanup(() => clearInterval(check))

  return props.children
}


export function DisconnectedGuard(props: ParentProps) {
  const navigate = useNavigate();

  onMount(async () => {
    await checkLogged()
  });

  const checkLogged = async () => {
    console.log('guard d')
    const logged = await isLoggedIn();
    if (!logged) {
      navigate('/login');
    }
  }

  const check = setInterval(() => {
    checkLogged();
  }, 10 * 1000);

  onCleanup(() => clearInterval(check))

  return props.children
}

export default function App() {
  return (
    <Router>
      <Route path="/login" component={() => (
        <ConnectedGuard>
          <Login/>
        </ConnectedGuard>
      )}/>
      <Route path="/" component={() => (
        <DisconnectedGuard>
          <PlayerContextProvider>
            <Player/>
          </PlayerContextProvider>
        </DisconnectedGuard>
      )}/>
      <Route path="/sucess" component={() => <div>You have been logged in, you can close this page</div>} />
      <Route path="/expired" component={() => <div>Code expired</div>} />
      <Route path="/failed" component={() => <div>Auth Failed</div>} />
    </Router>
  )
}


