//import from vote_controller
import repository from "../repository";
import yaml from "js-yaml";

const {
  getVoteObjectForConfirmation,
  createVote,
} = require("../controllers/votes_controller");

const {
  approveProposal,
  rejectProposal,
  featureProposal,
} = require("../controllers/proposals_controller");

const {
  createAdmin,
  deleteAdmin,
} = require("../controllers/admins_controller");

//Map website_socket_id --> app_socket_id
const webSocket_To_AppSocket_Map = new Map();
const appSocket_To_WebSocket_Map = new Map();
const signPayloadMap = new Map();

module.exports = (_io) => {
  _io.on("connection", (socket) => {
    console.log(socket.id);
    //event format: source-action-stage-target   = source_of_event-what_to_do-which_stage_we_are_at-target
    socket.on("ndau_burn_wallet_connect", (payload) => {
      toast.success("Wallet Connected", { position: "top-left" });
      const { website_socket_id, action, wallet_address, app_socket_id } =
        payload;
      console.log(website_socket_id, action, wallet_address, app_socket_id);
      console.log("got wallet connect event");
      socket
        // .to(website_socket_id)
        .emit("server-ndau_connection-established-website", {
          walletAddress: wallet_address,
        });
    });

    socket.on(
      "ndau_burn_request",
      async ({ npayWalletAddress, amount, website_socket_id }) => {
        console.log("npayWallet,", npayWalletAddress);
        console.log("amount,", amount);
        // console.log(website_socket_id);

        // ***************************
        // TODO: call API to burn ndau (Ed)
        // ...
        // call to ndau blockchain to burn ndau
        // ...

        // for testing
        const success = true;
        const ndauAddress = "ndau31DD92Ab8acd3Ce5741523C447B18821e7bba8";
        const npaySignature = "signature";
        const transactionHash =
          "0xa2dfad9673ca4215cd79d2423f2964ec0d4c3c9bdaef808776b080725005f428";

        // socket.emit("add_conversion_request", {
        //   ndau_address: ndauAddress,
        //   npay_address,
        //   amount,
        //   signature: npaySignature,
        //   transaction_hash: transactionHash,
        // })
        // save signature to database

        console.log("got ndau burn event");
        if (success) {
          const res = await repository.addConversion(
            ndauAddress,
            npayWalletAddress,
            amount,
            npaySignature,
            transactionHash
          );

          const result = await repository.getConversion();
          socket.emit("ndau_burn_approve", {
            transactions: result,
            walletAddress: ndauAddress,
          });
        } else {
          socket.emit("ndau_burn_reject", {});
        }
      }
    );

    socket.on(
      "app-ndau_connection-established-server",
      ({
        website_socket_id,
        connection_type,
        wallet_address,
        app_socket_id,
      }) => {
        console.log("app-ndau_connection-established-server");
        if (connection_type === "wallet") {
          socket
            .to(website_socket_id)
            .emit("server-ndau_connection-established-website", {
              walletAddress: wallet_address,
            });

          console.log(wallet_address, "wallet_address");

          webSocket_To_AppSocket_Map.set(website_socket_id, app_socket_id);
          appSocket_To_WebSocket_Map.set(app_socket_id, website_socket_id);
        }
      }
    );

    socket.on("website-ndau_connection-established-server", (_result) => {
      let appSocketId = webSocket_To_AppSocket_Map.get(
        _result.website_socket_id
      );
      socket
        .to(appSocketId)
        .emit("server-ndau_connection-established-app", _result);
    });

    ///////////////////////////////////// proposal rejectio
    socket.on(
      "website-proposal_reject-request-server",
      ({ proposalIdToReject, website_socket_id, wallet_address }) => {
        const appSocketId = webSocket_To_AppSocket_Map.get(website_socket_id);

        console.log(proposalIdToReject, "proposalIdToReject");
        socket.to(appSocketId).emit("server-proposal_reject-request-app", {
          proposalId: proposalIdToReject,
        });
      }
    );

    socket.on(
      "app-proposal_reject-denied-server",
      ({ proposalId, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        console.log(proposalId, "app-proposal_reject-denied-server");

        socket
          .to(webSiteSocketId)
          .emit("server-proposal_reject-denied-website", { proposalId }); //emit to website, proposal reject denied
      }
    );

    socket.on(
      "app-proposal_reject-confirmed-server",
      ({ proposalId, app_socket_id }) => {
        console.log(app_socket_id, "app_socket_id");

        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        async function rejectProposalAndNotify() {
          let rejectProposalResponse = await rejectProposal({
            proposalIDToReject: proposalId,
          });

          console.log(rejectProposalResponse, "rejectProposalResponse");

          if (rejectProposalResponse.status) {
            socket
              .to(webSiteSocketId)
              .emit("server-proposal_reject-fulfilled-website", { proposalId }); //emit to website, proposal successfully rejected
            socket.emit("server-proposal_reject-fulfilled-app"); //emit back to mobile too, proposal successfully rejected
          } else {
            socket
              .to(webSiteSocketId)
              .emit("server-proposal_reject-failed-website", { proposalId }); //emit to website, proposal rejection failed
            socket.emit("server-proposal_reject-failed-app", { proposalId }); //emit back to mobile too, proposal rejection failed
          }
        }
        rejectProposalAndNotify();
      }
    );

    // proposal_approve

    ///////////////////////////////////// proposal approval flow
    socket.on(
      "website-proposal_approve-request-server",
      ({ proposalIdToApprove, website_socket_id, wallet_address }) => {
        const appSocketId = webSocket_To_AppSocket_Map.get(website_socket_id);
        socket.to(appSocketId).emit("server-proposal_approve-request-app", {
          proposalId: proposalIdToApprove,
        });
      }
    );

    socket.on(
      "app-proposal_approve-denied-server",
      ({ proposalId, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        console.log(proposalId, "app-proposal_approve-denied-server");
        socket
          .to(webSiteSocketId)
          .emit("server-proposal_approve-denied-website", { proposalId }); //emit to website, proposal approval denied
      }
    );

    socket.on(
      "app-proposal_approve-confirmed-server",
      ({ proposalId, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        async function approveProposalAndNotify() {
          let approveProposalResponse = await approveProposal({
            proposalIDToApprove: proposalId,
          });
          if (approveProposalResponse.status) {
            socket
              .to(webSiteSocketId)
              .emit("server-proposal_approve-fulfilled-website", {
                proposalId,
              }); //emit to website, proposal successfully approved
            socket.emit("server-proposal_approve-fulfilled-app", {
              proposalId,
            }); //emit back to mobile too, proposal successfully approved
          } else {
            socket
              .to(webSiteSocketId)
              .emit("server-proposal_approve-failed-website", { proposalId }); //emit to website, proposal approve failed
            socket.emit("server-proposal_approve-failed-app", { proposalId }); //emit back to mobile too, proposal approve failed
          }
        }
        approveProposalAndNotify();
      }
    );

    //vote_create //////////////////////////////////////////////////////////////////////

    socket.on(
      //need to change it's name to app-create_vote-fulfilled-server, but isn't working correctly.
      //recheck at end
      "appCreateVoteConfirmedServer",
      async ({
        proposal_id,
        voting_option_id,
        proposal_heading,
        voting_option_heading,
        wallet_address,
        ballot,
        signature,
        app_socket_id,
        tracking_number = "",
      }) => {
        console.log("app-create_vote-confirmed-server");
        const websiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        const signPayloadData = signPayloadMap.get(app_socket_id);

        if (signPayloadData && isNaN(Number(proposal_id))) {
          signPayloadMap.delete(app_socket_id);

          socket.to(signPayloadData.websiteSocketId).emit("server-sign-fulfilled-website", {
            signature,
            payload: signPayloadData.payload,
          });

          socket.emit("server-vote_create-fulfilled-app", {
            walletAddress: wallet_address,
            proposal_heading,
            voting_option_heading,
          });

          return;
        }

        const res = await repository.addVote(
          proposal_id,
          voting_option_id,
          wallet_address,
          ballot,
          signature,
          {
            tracking_number,
          }
        );
        // const createVoteStatus = await createVote(voting_option_id, wallet_address);
        if (res && res.vote_id) {
          socket
            .to(websiteSocketId)
            .emit("server-vote_create-fulfilled-website", {
              walletAddress: wallet_address,
              proposal_id,
              proposal_heading,
              voting_option_heading,
            });

          socket.emit("server-vote_create-fulfilled-app", {
            walletAddress: wallet_address,
            proposal_heading,
            voting_option_heading,
          });
        } else {
          socket.to(websiteSocketId).emit("server-vote_create-failed-website", {
            walletAddress: wallet_address,
            proposal_heading,
            voting_option_heading,
          });
        }
      }
    );

    socket.on(
      "app-create_vote-rejected-server",
      async ({
        voting_option_id,
        proposal_heading,
        voting_option_heading,
        wallet_address,
        app_socket_id,
      }) => {
        // need to change it's name to app-create_vote-fulfilled-server, but isn't working correctly.
        // recheck at end

        console.log("app-create_vote-rejected-server");

        const websiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        const signPayloadData = signPayloadMap.get(app_socket_id);

        if (signPayloadData) {
          signPayloadMap.delete(app_socket_id);

          socket.to(signPayloadData.websiteSocketId).emit("server-sign-rejected-website", {});
          return;
        }

        socket.to(websiteSocketId).emit("server-vote_create-rejected-website", {
          walletAddress: wallet_address,
          proposal_heading,
          voting_option_heading,
        });
      }
    );

    ///// feature proposal
    socket.on(
      "website-feature_proposal-request-server",
      ({ proposalIdToFeature, website_socket_id }) => {
        console.log(
          proposalIdToFeature,
          "website-feature_proposal-request-server"
        );

        const appSocketId = webSocket_To_AppSocket_Map.get(website_socket_id);
        socket.to(appSocketId).emit("server-feature_proposal-request-app", {
          proposalId: proposalIdToFeature,
        });
      }
    );

    socket.on(
      "app-feature_proposal-denied-server",
      ({ proposalId, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        console.log(proposalId, "app-feature_proposal-denied-server");
        socket
          .to(webSiteSocketId)
          .emit("server-feature_proposal-denied-website", { proposalId }); //emit to website, proposal approval denied
      }
    );

    socket.on(
      "app-feature_proposal-confirmed-server",
      ({ proposalId, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        async function featureProposalAndNotify() {
          let featureProposalResponse = await featureProposal({
            proposalIDToFeature: proposalId,
          });

          console.log(featureProposalResponse, "featureProposalResponse");
          if (featureProposalResponse.status) {
            socket
              .to(webSiteSocketId)
              .emit("server-feature_proposal-fulfilled-website", {
                proposalId,
              }); //emit to website, proposal successfully features
            socket.emit("server-feature_proposal-fulfilled-app", {
              proposalId,
            }); //emit back to mobile too, proposal successfully features
          } else {
            socket
              .to(webSiteSocketId)
              .emit("server-feature_proposal-failed-website", { proposalId }); //emit to website, proposal featured failed
            socket.emit("server-feature_proposal-failed-app", { proposalId }); //emit back to mobile too, proposal featured failed
          }
        }
        featureProposalAndNotify();
      }
    );
    // feature proposal /////////////

    ///// add admin
    socket.on(
      "website-add_admin-request-server",
      ({ adminAddress, website_socket_id }) => {
        console.log(adminAddress, "website-add_admin-request-server");

        const appSocketId = webSocket_To_AppSocket_Map.get(website_socket_id);
        socket.to(appSocketId).emit("server-add_admin-request-app", {
          adminAddress,
        });
      }
    );

    socket.on(
      "app-add_admin-denied-server",
      ({ adminAddress, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        console.log(adminAddress, "app-add_admin-denied-server");
        socket
          .to(webSiteSocketId)
          .emit("server-add_admin-denied-website", { adminAddress }); //emit to website, proposal approval denied
      }
    );

    socket.on(
      "app-add_admin-confirmed-server",
      ({ adminAddress, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        async function addAdminAndNotify() {
          let addAdminResponse = await createAdmin({
            adminAddress,
          });
          if (addAdminResponse.status) {
            socket
              .to(webSiteSocketId)
              .emit("server-add_admin-fulfilled-website", {
                adminAddress,
              }); //emit to website, proposal successfully features
            socket.emit("server-add_admin-fulfilled-app", {
              adminAddress,
            }); //emit back to mobile too, proposal successfully features
          } else {
            socket
              .to(webSiteSocketId)
              .emit("server-add_admin-failed-website", { adminAddress }); //emit to website, proposal featured failed
            socket.emit("server-add_admin-failed-app", { adminAddress }); //emit back to mobile too, proposal featured failed
          }
        }
        addAdminAndNotify();
      }
    );
    // add admin /////////////

    ///// delete admin
    socket.on(
      "website-delete_admin-request-server",
      ({ adminAddress, website_socket_id }) => {
        console.log(adminAddress, "website-delete_admin-request-server");

        const appSocketId = webSocket_To_AppSocket_Map.get(website_socket_id);
        socket.to(appSocketId).emit("server-delete_admin-request-app", {
          adminAddress,
        });
      }
    );

    socket.on(
      "app-delete_admin-denied-server",
      ({ adminAddress, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        console.log(adminAddress, "app-delete_admin-denied-server");
        socket
          .to(webSiteSocketId)
          .emit("server-delete_admin-denied-website", { adminAddress }); //emit to website, delete admin denied
      }
    );

    socket.on(
      "app-delete_admin-confirmed-server",
      ({ adminAddress, app_socket_id }) => {
        const webSiteSocketId = appSocket_To_WebSocket_Map.get(app_socket_id);

        async function deleteAdminAndNotify() {
          let addAdminResponse = await deleteAdmin({
            adminId: adminAddress,
          });
          if (addAdminResponse.status) {
            socket
              .to(webSiteSocketId)
              .emit("server-delete_admin-fulfilled-website", {
                adminAddress,
              }); //emit to website, proposal successfully features
            socket.emit("server-delete_admin-fulfilled-app", {
              adminAddress,
            }); //emit back to mobile too, proposal successfully features
          } else {
            socket
              .to(webSiteSocketId)
              .emit("server-delete_admin-failed-website", {
                adminAddress,
              }); //emit to website, proposal featured failed
            socket.emit("server-delete_admin-failed-app", {
              adminAddress,
            }); //emit back to mobile too, proposal featured failed
          }
        }
        deleteAdminAndNotify();
      }
    );
    // delete admin /////////////

    // sign payload flow
    socket.on(
      "website-sign-request-server",
      ({ payload, walletAddress }) => {
        const websiteSocketId = socket.id;
        const appSocketId = webSocket_To_AppSocket_Map.get(websiteSocketId);

        if (appSocketId) {
          const decoded = Buffer.from(payload, "base64").toString("utf-8");
          const parsed = yaml.load(decoded);

          const voteInfoForApp = {
            proposal_heading: parsed.proposal.proposal_heading,
            proposal_id: parsed.proposal.proposal_id,
            voting_option_id: parsed.proposal.voting_option_id,
            voting_option_heading: parsed.proposal.voting_option_heading,
          };

          signPayloadMap.set(appSocketId, {
            payload,
            websiteSocketId,
          });

          socket.to(appSocketId).emit("server-create_vote-request-app", voteInfoForApp);
        } else {
          socket.emit("server-sign-failed-website", {
            message: "Wallet not connected",
          });
        }
      }
    );
    // sign payload flow /////////////

    socket.on("disconnect", (reason) => {
      console.log(socket.id + " disconnected for reason: " + reason);
    });
  });
};

async function create_vote_request_func({
  websiteSocketId,
  selectedVoteOptionId,
  walletAddress,
  socket: _socket,
}) {
  let appSocketId = webSocket_To_AppSocket_Map.get(websiteSocketId);

  const voteInfoForConfirmation = await getVoteObjectForConfirmation({
    votingOptionId: selectedVoteOptionId,
    userAddress: walletAddress,
  });

  if (
    voteInfoForConfirmation.proposal_id ||
    voteInfoForConfirmation.status !== false
  ) {
    _socket
      .to(appSocketId)
      .emit("server-create_vote-request-app", voteInfoForConfirmation);
  } else {
    _socket
      .to(appSocketId)
      .emit("server-create_vote-failed-app", voteInfoForConfirmation);

    _socket.emit("server-create_vote-failed-website", voteInfoForConfirmation); //this goes to website

    console.log(voteInfoForConfirmation, "create_vote_error");
  }
}
