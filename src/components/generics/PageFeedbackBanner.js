import React, { useEffect } from "react";
import { Box } from "@material-ui/core";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { clearPageFeedback } from "../../actions";
import FeedbackBanner from "./FeedbackBanner";

const PageFeedbackBanner = ({ clearPageFeedback, pageFeedback }) => {
  useEffect(() => () => clearPageFeedback(), [clearPageFeedback]);

  if (!pageFeedback) return null;

  return (
    <Box mb={2}>
      <FeedbackBanner severity={pageFeedback.severity} title={pageFeedback.title}>
        {pageFeedback.message}
      </FeedbackBanner>
    </Box>
  );
};

const mapStateToProps = (state) => ({ pageFeedback: state.core.pageFeedback });

const mapDispatchToProps = (dispatch) => bindActionCreators({ clearPageFeedback }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PageFeedbackBanner);
