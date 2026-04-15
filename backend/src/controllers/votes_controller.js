import { ndauSignatureToBytes } from '../utils/signature';
import { ndauPubkeyToBytes, ndauPubkeyToHex } from '../utils/public_key';
import { Generate } from '../utils/address';
import repository from '../repository';
import { getAccount } from '../helpers/fetch';
import yaml from 'yaml';

const crypto = require('crypto');
const secp256k1 = require('@noble/secp256k1');
const ed = require('@noble/ed25519');

const { pg } = require('../pg');
const checkIsBodyIncomplete = require('../utils/checkIsBodyIncomplete');

// console.log('testing generate....');
// const testPayload =
//   'eyJ2b3RlIjoieWVzIiwicHJvcG9zYWwiOnsicHJvcG9zYWxfaWQiOjEyLCJwcm9wb3NhbF9oZWFkaW5nIjoidGVzdGVyMSIsInZvdGluZ19vcHRpb25faWQiOjI2fSwicHVia2V5IjoibnB1YmE4amFkdGJiZWJraHhoYWVncTJweXd0OGs1djV3Znd2OHY2cTVya3o5NWdrNDNlYTdzZmc0em4yd2VwempjenpmYXhobWdweCJ9';

// // ed25591
// // const testPubkey = 'npuba8jadtbbebkhxhaegq2pywt8k5v5wfwv8v6q5rkz95gk43ea7sfg4zn2wepzjczzfaxhmgpx';
// // const testSign = 'a4jadtcavk64pvs7uc6aawtikevu7jzzvhtu6vfjqt2tsq7vbci2myzm3wrntb8cz3v6gv4ag3khazhhibqqh3t4kk7wueyxkesr6xeuaper8ce686ny7hqv';
// // const [pk, _] = ndauPubkeyToBytes(testPubkey);

// secp256k1
// const testPubkey =
//   'npuba4jaftckeebfpp3th3xixp2x3i6zq4zgekrugsp7zx7et7haeahky7vf36g25miaaaaaaaaaaaajtz94r9s6wdadvigzjwu28y45rf4xpm7sd583cmrrpb2uj9hb8vt6mmn2mtmz';
// const testSign =
//   'ayjaftcggbcaeid9rj2tfhxvykx7r9fzauqnjuknxx7b6eidr7bb52kuwymv62y6vwbcauxqg6sfxd3jydfzfven8k3n6mk7ne68rd7f5rmhdew28j5znsay362yif8w';
// const [pk, _] = ndauPubkeyToBytes(testPubkey);

/**************** test case 1 : Secp256k1 */
// const testPayload =
//   'eyJ2b3RlIjoieWVzIiwicHJvcG9zYWwiOnsicHJvcG9zYWxfaWQiOjEsInByb3Bvc2FsX2hlYWRpbmciOiJEZW1vIFByb3Bvc2FsIiwidm90aW5nX29wdGlvbl9pZCI6Miwidm90aW5nX29wdGlvbl9oZWFkaW5nIjoiVGVzdCBWb3RlIE9wdGlvbiAzIn0sIndhbGxldF9hZGRyZXNzIjoibmRhZjlnOTJxeXJuZzM5eXc1Y242NWNlcWh3aWFzeGVxeHhjZTM1dmU4enNwbWtmIiwidmFsaWRhdGlvbl9rZXkiOiJucHViYTRqYWZ0Y2tlZWI3bmFoNmF5NnFhaDk5bXBzc2t3YzJ2YnUyaWd6dGo2M3U1azVtMmN5d3lneWhxZGJxeXIyZ21zbmhpYWFhYWFhdDhpMjhxbnM3Mmt3aHE2M3AyM2FpaHcyaHQ0NGJicnBiNTZneDYzYnd3ZmtkZ2F4cmFqZGFuejZpM3AzNiJ9';
// const testPubkey =
//   'npuba4jaftckeeb7nah6ay6qah99mpsskwc2vbu2igztj63u5k5m2cywygyhqdbqyr2gmsnhiaaaaaat8i28qns72kwhq63p23aihw2ht44bbrpb56gx63bwwfkdgaxrajdanz6i3p36';
// const testSign =
//   'aujaftchgbcseiia4a5bui3j22khc9nrqt8fkbpm7aa4u9gw3m5itsqczchpjfd74rnseia6nwr9asq9hsuvitdvzxtu25kpcw352m5ag692e4v23vmbb9w78v6yiapn';
// const [pk, _] = ndauPubkeyToBytes(testPubkey);
/**************** end test case 1 : Secp256k1 */

/**************** test case 2 : Secp256k1 - wallet app with plain text payload*/
// let testPayload =
//   '{"vote":"yes","proposal":{"proposal_id":1,"proposal_heading":"Demo Proposal","voting_option_id":1,"voting_option_heading":"Test Vote Option 1"},"pubkey":"npuba4jaftckeeb4wuqt578x5duj8zp4s3e9w2ngx89shf9gmrhk78k453ibing573sg36a3iaaaaaaujp29k993teer7ygkk2x2x5akwghv2m23yikxxghgujezsck5muascnn6rn6e"}';
// const testPubkey =
//   'npuba4jaftckeeb4wuqt578x5duj8zp4s3e9w2ngx89shf9gmrhk78k453ibing573sg36a3iaaaaaaujp29k993teer7ygkk2x2x5akwghv2m23yikxxghgujezsck5muascnn6rn6e';
// const testSign =
//   'aujaftchgbcseiia6c8cvercf5zi3zmz7bpid6nf3qi799348z9hma5c8rm427ahg6tseicqd65y62c5wtaze9ic5sm5hk7z9gjue3kcrgzj6tt2jrycunbdicikdx46';
// const [pk, _] = ndauPubkeyToBytes(testPubkey);
/**************** end test case 2 : Secp256k1 */

/**************** test case 3 : Secp256k1 - wallet app with base64 encoded payload*/
/* IMPORTANT: The command line echo .... | base64 DO NOT produce a correct encoded 
const testPayload =
  'eyJ2b3RlIjoieWVzIiwicHJvcG9zYWwiOnsicHJvcG9zYWxfaWQiOjEsInByb3Bvc2FsX2hlYWRpbmciOiJEZW1vIFByb3Bvc2FsIiwidm90aW5nX29wdGlvbl9pZCI6MSwidm90aW5nX29wdGlvbl9oZWFkaW5nIjoiVGVzdCBWb3RlIE9wdGlvbiAxIn0sInB1YmtleSI6Im5wdWJhNGphZnRja2VlYjR3dXF0NTc4eDVkdWo4enA0czNlOXcybmd4ODlzaGY5Z21yaGs3OGs0NTNpYmluZzU3M3NnMzZhM2lhYWFhYWF1anAyOWs5OTN0ZWVyN3lna2syeDJ4NWFrd2dodjJtMjN5aWt4eGdoZ3VqZXpzY2s1bXVhc2NubjZybjZlIn0=';
const testPubkey =
  'npuba4jaftckeeb4wuqt578x5duj8zp4s3e9w2ngx89shf9gmrhk78k453ibing573sg36a3iaaaaaaujp29k993teer7ygkk2x2x5akwghv2m23yikxxghgujezsck5muascnn6rn6e';
const testSign =
  'aujaftchgbcseiia6c8cvercf5zi3zmz7bpid6nf3qi799348z9hma5c8rm427ahg6tseicqd65y62c5wtaze9ic5sm5hk7z9gjue3kcrgzj6tt2jrycunbdicikdx46';
const [pk, _] = ndauPubkeyToBytes(testPubkey);
/**************** end test case 3 : Secp256k1 */

// const testPub = ndauPubkeyToHex(testPubkey);
// console.log('tesetPub', testPub);

// //const bytePayload = new Uint8Array(Buffer.from(testPayload));
// const bytePayload = new Uint8Array(Buffer.from(testPayload, 'base64'));
// const hashPayload = crypto.createHash('sha256').update(bytePayload).digest();
// const hexPayload = Buffer.from(atob(testPayload)).toString('hex');
// console.log('testPayload:', testPayload.length, testPayload);
// console.log('hexPayload:', hexPayload);
// console.log('hashPayload:', hashPayload);

// console.log('testSign:', testSign);
// const [sign, al] = ndauSignatureToBytes(testSign);

// // console.log(Generate('a', pk.key));

// (async function () {
//   // const isValid = await ed.verify(sign.data, hexPayload, pk.key);
//   const isValid = await secp256k1.verify(sign.data, hashPayload, pk.key);
//   console.log('Valid sig: ', isValid);
// })();

const getProposalDetailsForVotingOption = async (_votingOptionId) => {
  const getProposalIdForVotingOptionQuery = pg`
  SELECT
    proposal_id,heading,voting_options.summary
  FROM
    proposals
  INNER JOIN
    voting_options USING(proposal_id)
  WHERE
    voting_option_id = ${_votingOptionId}
  `;

  const proposalId = await getProposalIdForVotingOptionQuery;
  return proposalId;
};

const getIsVotingOpenForProposal = async (_proposalId) => {
  const isVotingOpenQuery = pg`
  SELECT
  now() < closing_date is_voting_open
  FROM
    proposals
  WHERE
    proposal_id = ${_proposalId}
  `;

  const isVotingOpen = await isVotingOpenQuery;
  return isVotingOpen;
};

const getUserVotesForThisProposal = async (userAddress, votingOptionId) => {
  const userVotesForThisProposalQuery = pg`
  SELECT
    voting_option_id, t.proposal_id, voting_option_proposal_id
  FROM
  (
    SELECT
    proposal_id voting_option_proposal_id,
    proposal_id
  FROM
    voting_options
  INNER JOIN proposals USING(proposal_id)
  WHERE
    voting_option_id = ${votingOptionId}
  LIMIT 1
  ) t
  INNER JOIN voting_options USING(proposal_id)
  INNER JOIN votes USING(voting_option_id)
  WHERE
    user_address = ${userAddress} AND t.proposal_id = voting_option_proposal_id
  `;

  const userVotesForThisProposal = await userVotesForThisProposalQuery;
  return userVotesForThisProposal;
};

exports.getVoteObjectForConfirmation = async ({ votingOptionId, userAddress }) => {
  try {
    const isAnyValUndefined = checkIsBodyIncomplete({
      votingOptionId,
      userAddress,
    });

    if (isAnyValUndefined) {
      return {
        status: false,
        message: 'All Inputs are Required..!',
      };
    } else {
      let proposalIdArr = await getProposalDetailsForVotingOption(votingOptionId);

      const proposalId = proposalIdArr[0].proposal_id;

      const voteObjectForConfirmation = {
        proposal_heading: proposalIdArr[0].heading,
        proposal_id: proposalId,
        voting_option_id: votingOptionId,
        voting_option_heading: proposalIdArr[0].summary,
      };

      const isVotingOpenQueryResult = await getIsVotingOpenForProposal(proposalId);

      const isValidProposal = isVotingOpenQueryResult.length > 0;

      if (isValidProposal) {
        const isVotingOpen = isVotingOpenQueryResult[0].is_voting_open;

        if (isVotingOpen) {
          const userVotesForThisProposal = await getUserVotesForThisProposal(userAddress, votingOptionId);
          const hasUserAlreadyVotedForThisProposal = Boolean(userVotesForThisProposal.length);

          if (hasUserAlreadyVotedForThisProposal) {
            return {
              status: false,
              hasUserAlreadyVotedForThisProposal,
            };
          } else {
            return voteObjectForConfirmation;
          }
        } else {
          return {
            status: false,
            isVotingOpen,
          };
        }
      } else {
        return {
          status: false,
          isValidProposal,
        };
      }
    }
  } catch (e) {
    console.log(e, 'error');
    return {
      status: false,
      message: 'Server Error',
    };
  }
};

exports.hasUserVoted = async (req, res, next) => {};

exports.addVote = async (req, res, next) => {
  const { payload, signature } = req.body;
  try {
    const b64DecodedMsg = atob(payload);
    const ballot = yaml.parse(b64DecodedMsg);
    const { validation_key, proposal, wallet_address } = ballot;
    const { proposal_id, voting_option_id } = proposal;

    console.log('ballot, validation_key, wallet_address, signature', ballot, validation_key, wallet_address, signature);

    const account = await getAccount(wallet_address);
    if (!account || !account[wallet_address]) {
      return res.status(400).json({
        status: false,
        message: 'Wallet address not found or blank',
      });
    }

    const { validationKeys } = account[wallet_address];
    const ndauPubkey = validationKeys[0];
    console.log('ndauPubkey.....', ndauPubkey);
    if (validation_key !== ndauPubkey) {
      return res.status(400).json({
        status: false,
        message: 'The validation keys are mismatched. Please try again!',
      });
    }

    console.log('Extracting signature...');
    const [sign, err] = ndauSignatureToBytes(signature);
    if (err !== null) {
      return res.status(400).json({
        status: false,
        message: 'Bad signature',
      });
    }
    const [pk, _] = ndauPubkeyToBytes(ndauPubkey);
    // const wallet_address = Generate('a', pk.key);

    let hexPayload;
    let bytePayload;
    let hashPayload;
    let isValid = false;
    switch (sign.algorithm) {
      case 'Ed25519':
        hexPayload = Buffer.from(b64DecodedMsg).toString('hex');
        isValid = await ed.verify(sign.data, hexPayload, pk.key);
        break;
      case 'Secp256k1':
        bytePayload = new Uint8Array(Buffer.from(b64DecodedMsg));
        hashPayload = crypto.createHash('sha256').update(bytePayload).digest();
        isValid = await secp256k1.verify(sign.data, hashPayload, pk.key);
        break;
      default:
        return res.status(400).json({
          status: false,
          message: 'Unsupported signature algorithm',
        });
    }

    console.log('Signature verified: ', isValid);
    if (!isValid) {
      return res.status(400).json({
        status: false,
        message: 'Failed in signature verification process',
      });
    }

    const alreadyVoted = await repository.countVoteByAddress(proposal_id, wallet_address);
    console.log('alreadyVoted:', alreadyVoted);
    if (alreadyVoted && alreadyVoted.count > 0) {
      return res.status(400).json({
        status: false,
        message: 'This wallet address voted already',
      });
    }

    // Save vote to database
    const result = await repository.addVote(proposal_id, voting_option_id, wallet_address, ballot, signature, {
      tracking_number: '',
    });
    if (result && result.vote_id) {
      res.status(201).json({
        status: true,
        message: 'Ballot added',
      });
    } else {
      res.status(500).json({
        status: 'false',
        message: 'server error: failed to save ballot to database',
      });
    }
  } catch (e) {
    console.log('error', e);
  }
};
