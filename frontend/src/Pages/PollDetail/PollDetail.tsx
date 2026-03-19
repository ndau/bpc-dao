import { useState, useEffect } from 'react';
import { Button, Placeholder, ProgressBar, Table, Container } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { axiosRequest } from '../../api/api';
import PollComponentSimple from '../../Components/PollComponent/PollComponentSimple';
import VoteOption from '../../Components/PollComponent/VoteOption/VoteOption';
import VoteButton from '../../Components/VoteButton/VoteButton';
import { adminProcessedProposalResponseI, pollResponseBaseObjI } from '../../types/responseTypes';
import { indexOfMax } from '../../utils/indexOfMax';
import useAdminPanelRefreshStore from '../../store/adminPanelRefresh_store';
import useNdauConnectStore from '../../store/ndauConnect_store';

interface ProposalVotesState {
  user_address: string;
  summary: string;
  ballot: string;
  signature: string;
  voting_option_id: number;
  voting_power: string;
  createdon: string;
}
//interface T extends adminProcessedProposalResponseI, pollResponseBaseObjI{};

const PollDetail = () => {
  const voteNumberFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });

  const formatVoteValue = (value: number) => voteNumberFormatter.format(Number.isFinite(value) ? value : 0);

  const setRefreshProposalDetailFunc = useAdminPanelRefreshStore((state) => state.setRefreshProposalDetailFunc);
  const { proposalId = '' } = useParams();
  const walletAddress = useNdauConnectStore((state) => state.walletAddress);
  const voted = useNdauConnectStore((state) => !!state.votes[proposalId]);
  const setVoted = useNdauConnectStore((state) => state.setVoted);

  const goBack = () => navigate(-1);
  const [selectedVoteOptionIndexState, setSelectedVoteOptionIndexState] = useState<number | undefined>();

  const [pollDetailState, setPollDetailState] = useState({
    approved_on: '',
    proposal_heading: '',
    summary: '',
    closing_date: '',
    total_votes: 0,
    is_active: false,
    proposal_id: 0,
    voting_options_headings: [],
  });
  const {
    approved_on,
    proposal_heading,
    proposal_id,
    summary,
    closing_date,
    voting_options_headings,
    total_votes,
    is_active,
  } = pollDetailState || {};

  console.log('voting_options_headings', voting_options_headings);
  const votingOptionsArray: string[] = voting_options_headings ? Object.values(voting_options_headings) : [];
  const votingOptionsIdArray: string[] = voting_options_headings ? Object.keys(voting_options_headings) : [];

  const [proposalVotesState, setProposalVotesState] = useState<ProposalVotesState[]>();
  let totalVotes = 0;
  const tally = proposalVotesState?.reduce((acc: ProposalVotesState | any, v) => {
    if (acc[v.summary]) {
      acc[v.summary] += v.voting_power ? parseFloat(v.voting_power) : 0;
      if (acc[acc.max] < acc[v.summary]) {
        acc.max = v.summary;
      }
    } else {
      acc[v.summary] = v.voting_power ? parseFloat(v.voting_power) : 0;
      if (!acc.max) {
        acc.max = v.summary;
      } else if (acc[acc.max] < acc[v.summary]) {
        acc.max = v.summary;
      }
    }
    totalVotes = totalVotes + acc[v.summary];

    return acc;
  }, {});

  useEffect(() => {
    async function getPollDetails() {
      let pollDetailResponse = await axiosRequest('get', 'proposal', undefined, {
        proposal_Id: proposalId,
        loggedInWalletAddress: walletAddress,
      });

      const proposalDetail = pollDetailResponse.data.proposalDetails[0];
      const {
        voting_options_headings,
        is_active: proposalCompleted,
        votes_cast_agg,
        hasUserAlreadyVotedObj,
      } = proposalDetail;

      setPollDetailState(proposalDetail);
      setVoted(hasUserAlreadyVotedObj && hasUserAlreadyVotedObj.status, proposalId);

      setProposalVotesState(pollDetailResponse.data.proposalVotesDetails);

      const userVotedForOptionId = hasUserAlreadyVotedObj?.voting_option_id;
      console.log('hasUserAlreadyVotedObj......', hasUserAlreadyVotedObj);

      let votingOptionsIdArray = Object.keys(voting_options_headings);
      console.log('votingOptionsIdArray......', votingOptionsIdArray);

      if (userVotedForOptionId) {
        let voteCastIndex = votingOptionsIdArray.findIndex((item) => Number(item) === userVotedForOptionId);
        if (voteCastIndex === -1) return;
        else {
          console.log(voteCastIndex, 'voteCastIndex');
          setSelectedVoteOptionIndexState(voteCastIndex);
        }
      }

      // if (!proposalCompleted) {
      //   const votesCastArray : number[] = Object.values(votes_cast_agg);
      //   const mostVotesIndex = indexOfMax(votesCastArray);
      //   setSelectedVoteOptionIndexState(mostVotesIndex);
      // }
    }

    // setRefreshProposalDetailFunc(getPollDetails);

    getPollDetails();
  }, [walletAddress, voted]);

  const navigate = useNavigate();
  let selectedVoteOptionId;
  if (selectedVoteOptionIndexState !== undefined) {
    selectedVoteOptionId = Number(votingOptionsIdArray[selectedVoteOptionIndexState]);
  }

  return (
    <>
      <div style={{ backgroundColor: '#0B2140', paddingBottom: 20 }}>
        <Container
          className="poll-container"
          fluid="lg"
          style={{ padding: '10px', paddingTop: '20px', minHeight: '80vh' }}
        >
          <div style={{ width: '80%', margin: 'auto' }} className="py-3">
            <h4 className="text-white" style={{ textAlign: 'center' }}>
              Proposal
            </h4>
            <Button
              style={{
                backgroundColor: '#0F2748',
                border: 'none',
                color: '#DBE0E8',
              }}
              className="my-2"
              onClick={goBack}
            >
              <img src="assets/images/icons/backArrow.svg" style={{ height: '20px', marginRight: '10px' }} alt="" />
              {'    Back'}
            </Button>

            {pollDetailState ? (
              <PollComponentSimple
                pollComponentPropsObj={{
                  addedOn: approved_on,
                  proposal: proposal_heading,
                  proposalId: proposal_id,
                  summary,
                  closingOn: closing_date,
                  votingOptions: voting_options_headings,
                  totalVotes: total_votes,
                  isActive: is_active,
                }}
              >
                <>
                  <div className="p-4" style={{ marginTop: -30 }}>
                    <h4 className="text-white " style={{ fontWeight: 'bold' }}>
                      Value Breakdown
                    </h4>

                    {votingOptionsArray.map((item, index) => (
                      <div key={votingOptionsIdArray[index]}>
                        <div
                          className="py-2"
                          style={{
                            color: '#ABABAB',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>{item}</div>{' '}
                          <div>
                            Votes Cast:{' '}
                            {formatVoteValue(tally[item])}
                          </div>
                        </div>
                        <div
                          style={{
                            border: `6px solid ${is_active || item != tally.max ? 'transparent' : '#198754'}`,
                            borderRadius: 8,
                          }}
                        >
                          <ProgressBar
                            variant="warning"
                            now={isNaN(tally[item]) ? 0 : (tally[item] / totalVotes) * 100}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row p-4">
                    <div
                      className="col-md-6 p-4 "
                      style={{
                        borderTop: '2px solid #234065',
                        borderBottom: '2px solid #234065',
                      }}
                    >
                      <div>
                        <h6 className="text-white fw-bold">Voting Options</h6>
                        {votingOptionsArray.map((item, index) => (
                          <div
                            key={votingOptionsIdArray[index]}
                            onClick={
                              is_active
                                ? !voted
                                  ? () => setSelectedVoteOptionIndexState(index)
                                  : undefined
                                : undefined
                            }
                            style={{ color: '#CCC', fontSize: '0.6em' }}
                          >
                            {`Option ${index + 1}`}
                            <VoteOption
                              voteOptionSummary={item}
                              selected={index === selectedVoteOptionIndexState}
                              smMarginTop
                            />
                          </div>
                        ))}
                        {is_active &&
                          // Need to ensure selectedVoteOptionIdState is not undefined, as index 0 is valid, but is a falsy value
                          (voted ? (
                            <Button
                              style={{
                                marginTop: 0,
                                backgroundColor: '#F89D1C',
                                border: '#0A1D35',
                              }}
                              disabled
                            >
                              Voted
                            </Button>
                          ) : (
                            <VoteButton
                            allowVote={selectedVoteOptionIndexState !== undefined}
                              selectedVoteOption={{
                                proposal_id,
                                proposal_heading,
                                voting_option_id: selectedVoteOptionId || -1,
                                voting_option_heading: votingOptionsArray[selectedVoteOptionId || -1],
                              }}
                            />
                          ))}
                      </div>
                    </div>
                    <div
                      className="col-md-6  p-3"
                      style={{
                        borderLeft: '2px solid #234065',
                        borderTop: '2px solid #234065',
                        borderBottom: '2px solid #234065',
                      }}
                    >
                      <h6 className="text-white fw-bold">Voting Stats</h6>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#ABABAB',
                        }}
                      >
                        <div>Total Votes</div>
                        <div>{total_votes}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h5 style={{ color: 'white', fontWeight: 'bold' }}>Voting By Address</h5>
                    <Table responsive borderless>
                      <thead
                        style={{
                          background:
                            'transparent linear-gradient(180deg, #093D60 0%, #132A47 100%) 0% 0% no-repeat padding-box',
                          color: 'white',
                        }}
                      >
                        <tr>
                          <th>DATE</th>
                          <th>
                            {/* <div style={checkMobile ? styleTableHeading : " "}> */}
                            <div>ADDRESS</div>
                          </th>
                          <th>OPTION</th>
                          <th>
                            {' '}
                            <div style={{ minWidth: 100, textAlign: 'right' }}>
                              {is_active ? 'VOTES' : 'FINAL VOTES'}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ backgroundColor: '#1A3356', color: '#F89D1C' }}>
                        {proposalVotesState?.map((item, idx) => {
                          return (
                            <tr key={item.user_address + idx}>
                              <td>{new Date(item.createdon).toLocaleDateString()}</td>
                              <td style={{ maxWidth: 360 }}>
                                {item.user_address}
                                <br />
                                <div style={{ color: 'darkgrey', fontStyle: 'italic', fontSize: 'small' }}>
                                  signature: {item.signature}
                                </div>
                              </td>
                              <td>{item.summary}</td>
                              <td>
                                <div style={{ textAlign: 'right' }}>
                                  {formatVoteValue(parseFloat(item.voting_power))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                </>
              </PollComponentSimple>
            ) : (
              <Placeholder xs={12} className="vh-100" />
            )}
          </div>
        </Container>
      </div>
    </>
  );
};

export default PollDetail;
