import { Web3WalletTypes } from '@walletconnect/web3wallet';
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data';
import ModalStore from '@/store/modalStore';
import SettingsStore from '@/store/settingsStore';
import { web3wallet } from '@/utils/walletConnectUtil';
import { SignClientTypes } from '@walletconnect/types';
import { useCallback, useEffect } from 'react';
import { ErrorResponse } from "@walletconnect/jsonrpc-types";

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext);
      ModalStore.open('SessionProposalModal', { proposal });
      console.log('session_proposal:' , proposal);
    },
    []
  )
   /******************************************************************************
   * 2. Open Auth modal for confirmation / rejection
   *****************************************************************************/
  const onAuthRequest = useCallback((request: Web3WalletTypes.AuthRequest) => {
    console.log('auth_request', request);
    ModalStore.open('AuthRequestModal', { request });
  }, [])

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      console.log('session_request', requestEvent)
      const { topic, params, verifyContext } = requestEvent;
      const { request } = params;
      const requestSession = getRequestSession(topic);
      // set the verify context so it can be displayed in the projectInfoCard
      SettingsStore.setCurrentRequestVerifyContext(verifyContext);
      console.log('session_request_method', request.method);
      switch (request.method) {
        case EIP155_SIGNING_METHODS.ETH_SIGN:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          return ModalStore.open('SessionSignModal', { requestEvent, requestSession })

        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
          return ModalStore.open('SessionSignTypedDataModal', { requestEvent, requestSession })

        case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
          return ModalStore.open('SessionSendTransactionModal', { requestEvent, requestSession })

        default:
          return ModalStore.open('SessionUnsuportedMethodModal', { requestEvent, requestSession })
      }
    },
    []
  );

  const getRequestSession = (topic: string) => {
    try {
      return web3wallet.engine.signClient.session.get(topic);
    } catch (error: any) {
      web3wallet.engine.signClient.session.delete(topic, {code: 0, message: error.message} as ErrorResponse);
    }
  }

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      console.log('WalletConnect initialized');
      //sign
      web3wallet.on('session_proposal', onSessionProposal);
      web3wallet.on('session_request', onSessionRequest);
      // auth
      web3wallet.on('auth_request', onAuthRequest);
      // TODOs
      web3wallet.engine.signClient.events.on('session_ping', data => console.log('ping', data));
      web3wallet.on('session_delete', data => console.log('delete', data));
    }
  }, [initialized, onAuthRequest, onSessionProposal, onSessionRequest]);
}
