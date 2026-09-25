// src/components/home/SellerStories.jsx

function SellerStories({ stories = [] }) {
  return (
    <section className="seller-stories">
      <div className="container">
        <div className="seller-stories__list">
          {stories.map((story) => (
            <article key={story.id} className="seller-stories__card">
              <div className="seller-stories__thumbnail">
                {story.videoThumbnail ? (
                  <img src={story.videoThumbnail} alt={`${story.sellerName} promotion`} />
                ) : (
                  <div className="seller-stories__placeholder">Video</div>
                )}

                <span className="seller-stories__play">&gt;</span>
              </div>

              <div className="seller-stories__seller">
                {story.sellerImage ? (
                  <img src={story.sellerImage} alt={story.sellerName} />
                ) : (
                  <span className="seller-stories__avatar">
                    {story.sellerName.charAt(0)}
                  </span>
                )}

                <span>{story.sellerName}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SellerStories;
