
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { fetchSignInMethodsForEmail } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDKDDmwFHNhLX3VEWOy-9pfosIX0JfMki4",
  authDomain: "algo-fight.firebaseapp.com",
  projectId: "algo-fight",
  storageBucket: "algo-fight.firebasestorage.app",
  messagingSenderId: "811777562185",
  appId: "1:811777562185:web:210953e018470785aad198",
  measurementId: "G-E1RY503D7K"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
const googleBox = new GoogleAuthProvider();
const githubBox = new GithubAuthProvider();

const getProviderLabel = (providerId) => {
  if (providerId === "google.com") return "Google";
  if (providerId === "github.com") return "GitHub";
  return providerId || "another provider";
};

const accountExistsNotice = (email, providerId) => ({
  type: "warning",
  title: "Account Already Exists",
  message: `${email} is already registered with ${getProviderLabel(providerId)}. Sign in with that provider first to link your account.`,
});

export const  googleSignIn = async() => {
  try {
    const result = await signInWithPopup(auth, googleBox);
    const user = result.user;
    console.log("Successfully signed in");

    return {
      user,
      notice: {
        type: "success",
        title: "Signed In",
        message: "Welcome back. Signed in with Google.",
      },
    };
    
  } catch (error) {

    console.log("Google-sign-in error",error.code);

    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || "this email";
      const pendingCred = GoogleAuthProvider.credentialFromError(error);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const firstSignInMethod = methods[0];

      if (firstSignInMethod === "github.com" && pendingCred) {
        try {
          const githubProvider = new GithubAuthProvider();
          const linkResult = await signInWithPopup(auth, githubProvider);
          const linkedUser = linkResult.user;
          await linkedUser.linkWithCredential(pendingCred);

          console.log("Successfully linked GitHub to existing account.");
          return {
            user: linkedUser,
            notice: {
              type: "success",
              title: "Accounts Linked",
              message: "Google and GitHub accounts were linked successfully.",
            },
          };
        } catch (linkError) {
          console.log("Account link error", linkError.code);
          return {
            user: null,
            errorCode: linkError.code,
            notice: {
              type: "error",
              title: "Linking Failed",
              message: "Could not link your accounts. Please try signing in with your original provider.",
            },
          };
        }
      }

      return {
        user: null,
        errorCode: error.code,
        notice: accountExistsNotice(email, firstSignInMethod),
      };
    }

    console.log("Other sign-up error",error.code);
    return {
      user: null,
      errorCode: error.code,
      notice: {
        type: "error",
        title: "Google Sign-In Failed",
        message: "Unable to sign in with Google right now. Please try again.",
      },
    };
  }
}
export const  githubSignIn = async() => {
  try {
    const result = await signInWithPopup(auth, githubBox);
    const user = result.user;
    console.log("Successfully signed in");

    return {
      user,
      notice: {
        type: "success",
        title: "Signed In",
        message: "Welcome back. Signed in with GitHub.",
      },
    };
    
  } catch (error) {

    console.log("Google-sign-in error",error.code);

    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || "this email";
      const pendingCred = GithubAuthProvider.credentialFromError(error);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const firstSignInMethod = methods[0];

      if (firstSignInMethod === "google.com" && pendingCred) {
        try {
          const googleProvider = new GoogleAuthProvider();
          const linkResult = await signInWithPopup(auth, googleProvider);
          const linkedUser = linkResult.user;
          await linkedUser.linkWithCredential(pendingCred);

          console.log("Successfully linked Google to existing account.");
          return {
            user: linkedUser,
            notice: {
              type: "success",
              title: "Accounts Linked",
              message: "GitHub and Google accounts were linked successfully.",
            },
          };
        } catch (linkError) {
          console.log("Account link error", linkError.code);
          return {
            user: null,
            errorCode: linkError.code,
            notice: {
              type: "error",
              title: "Linking Failed",
              message: "Could not link your accounts. Please try signing in with your original provider.",
            },
          };
        }
      }

      return {
        user: null,
        errorCode: error.code,
        notice: accountExistsNotice(email, firstSignInMethod),
      };
    }

    console.log("Other sign-up error",error.code);
    return {
      user: null,
      errorCode: error.code,
      notice: {
        type: "error",
        title: "GitHub Sign-In Failed",
        message: "Unable to sign in with GitHub right now. Please try again.",
      },
    };
  }
}