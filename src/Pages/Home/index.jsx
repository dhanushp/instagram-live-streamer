import React, { useState, useRef } from "react";
import styles from "./styles.module.scss";
import { connect } from "react-redux";
import { LiveEntity } from "instagram-private-api";
import LoadingBar from "../../components/LoadingBar";
import TextInput from "../../components/TextInput";
import Button from "../../components/Button";
import { useHistory } from "react-router-dom";
import CommentIcon from "../../images/comment.svg";
import Comments from "../Comments";
import { getClient, removeSession } from "../../lib/igClient";
import { clearComments } from "../../store/User/actions";
import CopyIcon from "../../images/copy.svg";
import copy from "copy-to-clipboard";

function Home({ profile, dispatch }) {
  const client = getClient();
  const history = useHistory();
  if (!(profile && profile.username)) history.push("/");
  const { username, full_name, profile_pic_url } = profile;
  const [isLive, setLive] = useState(false);
  const [isReady, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastId, setBroadcastId] = useState(null);
  const [streamURL, setStreamURL] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [showComments, setShowComments] = useState(false);

  const iUrlRef = useRef();
  const iKeyRef = useRef();

  const startLiveStream = async () => {
    setIsLoading(true);
    const { broadcast_id, upload_url } = await client.live.create({
      // create a stream in 720x1280 (9:16)
      previewWidth: 720,
      previewHeight: 1280,
      // this message is not necessary, because it doesn't show up in the notification
      message: "My message",
    });
    console.log({ broadcast_id, upload_url });
    setBroadcastId(broadcast_id);
    const { stream_key, stream_url } = LiveEntity.getUrlAndKey({
      broadcast_id,
      upload_url,
    });
    console.log({ stream_key, stream_url });
    setStreamURL(stream_url);
    setStreamKey(stream_key);
    setReady(true);
    setIsLoading(false);
  };

  const goLive = async () => {
    setIsLoading(true);
    if (broadcastId) {
      try {
        await client.live.start(broadcastId);
        await client.live.unmuteComment(broadcastId);
        dispatch(clearComments());
        setLive(true);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        setReady(false);
        setLive(false);
      }
    }
  };

  const stopLiveStream = async () => {
    setIsLoading(true);
    await client.live.endBroadcast(broadcastId);
    await client.live.addToPostLive(broadcastId);
    if (window.refreshInterval) {
      clearInterval(window.refreshInterval);
    }
    setLive(false);
    setReady(false);
    setBroadcastId(null);
    setStreamKey(null);
    setStreamURL(null);
    setIsLoading(false);
  };

  const logout = async () => {
    console.log("Logging out");
    removeSession();
    client.account.logout();
    history.push("/");
  };

  const getButtonAndLoaders = () => {
    if (isLoading) {
      return (
        <div>
          <LoadingBar />
        </div>
      );
    } else if (isReady && !isLive) {
      return (
        <button className={styles.goLiveButton} onClick={goLive}>
          Go Live!
        </button>
      );
    } else if (isLive) {
      return (
        <button className={styles.stopButton} onClick={stopLiveStream}>
          Stop Steam
        </button>
      );
    } else {
      return (
        <div
          style={{
            display: `flex`,
            flexDirection: `column`,
            justifyContent: `center`,
          }}
        >
          <button className={styles.liveButton} onClick={startLiveStream}>
            Start Live Stream
          </button>
          <Button onClick={() => logout()} buttontype="clear">
            Logout
          </Button>
        </div>
      );
    }
  };

  const copyUrl = () => {
    copy(streamURL);
    iUrlRef.current.select();
  };

  const copyKey = () => {
    copy(streamKey);
    iKeyRef.current.select();
  };

  return (
    <div className={styles.homePage}>
      <div className={styles.pageContents}>
        <div
          className={`${styles.profilePicWrapper} ${
            isLive ? styles.liveBorder : ""
          }`}
        >
          <img src={profile_pic_url} className={styles.profilePic} />
          {isLive ? <span className={`${styles.liveTag}`}> Live</span> : <></>}
        </div>
        <div className={styles.texts}>
          <h4 className={styles.fullName}>{full_name}</h4>
          <p className={styles.username}>@{username}</p>
        </div>
        {getButtonAndLoaders()}
        {isReady ? (
          <>
            <div className={styles.linkFields}>
              <label>Stream URL</label>
              <div className={styles.row}>
                <TextInput value={streamURL} forwardRef={iUrlRef} readOnly />
                <button className={styles.copyIcon} onClick={copyUrl}>
                  <img src={CopyIcon} />
                </button>
              </div>
              <label>Stream Key</label>
              <div className={styles.row}>
                <TextInput
                  value={streamKey}
                  type="password"
                  forwardRef={iKeyRef}
                  readOnly
                />
                <button className={styles.copyIcon} onClick={copyKey}>
                  <img src={CopyIcon} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <></>
        )}
      </div>
      {isLive ? (
        <div className={styles.popupContents}>
          <div
            className={`${styles.fab}`}
            onClick={() => setShowComments(!showComments)}
          >
            <img src={CommentIcon} alt="" />
          </div>

          <Comments
            open={showComments}
            broadcastId={broadcastId}
            clickClose={() => setShowComments(!showComments)}
          />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

const mapStateToProps = function (state) {
  return {
    isLoggedIn: state.auth.isLoggedIn,
    profile: state.user.profile,
  };
};

export default connect(mapStateToProps)(Home);
