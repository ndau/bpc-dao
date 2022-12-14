import React from "react";
import { Placeholder } from "react-bootstrap";
import { axiosRequest } from "../../../api/api";
import PollComponent from "../../../Components/PollComponent/PollComponent";
import { adminProcessedProposalResponseI } from "../../../types/responseTypes";

function LatestCompletedPolls() {
  const [concludedPollStaate, setConcludedPollState] = React.useState<
    adminProcessedProposalResponseI[]
  >([]);

  React.useEffect(() => {
    axiosRequest("get", "proposal/latest-completed?limit=3").then((val) => {
      setConcludedPollState(val.data.proposals);
    });
  }, []);

  return (
    <div className="col-md-6">
      <h3 className="text-white pt-5">Concluded Proposals</h3>
      {concludedPollStaate.length > 0 ? (
        concludedPollStaate.map((val) => {
          let hasUserAlreadyVotedObj;

          if (val.hasUserAlreadyVotedObj) {
            hasUserAlreadyVotedObj = {
              status: val.hasUserAlreadyVotedObj.status,
              index: val.hasUserAlreadyVotedObj.index,
              voting_option_id: val.hasUserAlreadyVotedObj.voting_option_id,
            };
          } else {
            hasUserAlreadyVotedObj = {
              status: false,
              index: -1,
              voting_option_id: -1,
            };
          }
          return (
            <div className="py-2" key={val.proposal_id}>
              <PollComponent
                proposalId={val.proposal_id}
                addedOn={val.approved_on}
                proposal={val.proposal_heading}
                summary={val.summary}
                closingOn={val.closing_date}
                votingOptionsHeadings={{}}
                votingOptionsVotesCast={{}}
                totalVotes={val.total_votes}
                isActive={val.is_active}
                hasUserAlreadyVotedObj={hasUserAlreadyVotedObj}
                isHideVoteButton={true}
              />
            </div>
          );
        })
      ) : (
        <Placeholder xs={12} className="vh-100" />
      )}
    </div>
  );
}

export default LatestCompletedPolls;
