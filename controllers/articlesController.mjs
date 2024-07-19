import asyncHandler from 'express-async-handler';
import Article from '../models/article.mjs';
import User from '../models/user.mjs';
import Comment from '../models/comment.mjs';
import { v2 as cloudinary } from 'cloudinary';

export const articles_get = asyncHandler(async (req, res, next) => {
    try {
        const articles = await Article.find({ isPublished: true }).select('-isPublished -description');

        const populatedArticles = await Promise.all(articles.map(async (article) => {
            const author = await User.findById(article.author).select('firstName lastName');
            return {
                ...article.toObject(),
                author
            };
        }));

        res.status(200).json(populatedArticles);
    } catch (error) {
        next(error);
    }
});

export const article_detail_get = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user ? req.user._id : null;

  try {
      const article = await Article.findOne({ _id: id, isPublished: true })
          .populate('author', '-password');

      if (!article) {
          return res.status(404).json({ message: 'Article not found' });
      }

      let comments = await Comment.find({ articleId: id }).populate('author', 'firstName lastName');

      if (userId) {
          comments = comments.map(comment => {
              let reaction = null;

              const liked = comment.likes.includes(userId);
              const unliked = comment.unlikes.includes(userId);

              if (liked) {
                  reaction = 'like';
              } else if (unliked) {
                  reaction = 'unlike';
              }

              return {
                  ...comment.toObject(),
                  reaction: reaction,
              };
          });
      }

      const articleWithComments = {
          ...article.toObject(),
          comments: comments,
      };

      res.status(200).json(articleWithComments);
  } catch (err) {
      console.error('Error fetching article:', err);
      res.status(500).json({ message: 'Server error' });
  }
});

export const article_create_post = asyncHandler(async (req, res, next) => {
    const { title, subtitle, description, isPublished } = req.body;
    const image = req.file;

    if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
    }

    const authorId = req.user._id;

    try {
        let imageUrl = '';
        if (image) {
            const uploadResult = await cloudinary.uploader.upload(image.path);
            imageUrl = uploadResult.secure_url;
        }

        const newArticle = new Article({
            title,
            subtitle,
            description,
            isPublished,
            image: imageUrl,
            author: authorId,
        });

        const savedArticle = await newArticle.save();

        res.status(201).json({ id: savedArticle._id });
    } catch (error) {
        console.error('Error create article:', error);
    }
});

export const article_add_comment_post = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { message } = req.body;
    const author = req.user._id;
    const firstName = req.user.firstName;
    const lastName = req.user.lastName;
  
    try {
      const article = await Article.findById(id);
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }
  
      const newComment = new Comment({
        articleId: id,
        author,
        text: message,
      });
  
      await newComment.save();
  
      res.status(201).json({
        ...newComment.toJSON(),
        author: {
          firstName,
          lastName,
        },
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
});  

