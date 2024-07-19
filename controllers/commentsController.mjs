import asyncHandler from 'express-async-handler';
import Comment from '../models/comment.mjs';

export const comment_reaction_post = asyncHandler(async (req, res, next) => {
    const { id, reaction } = req.params;
    const userId = req.user._id.toString();

    try {
        let comment = await Comment.findById(id);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const likeReaction = comment.likes.includes(userId);
        const unlikeReaction = comment.unlikes.includes(userId);

        if (reaction === 'like') {
            if (likeReaction) {
                comment.likes = comment.likes.filter(user => user.toString() !== userId);
            } else {
                if (unlikeReaction) {
                    comment.unlikes = comment.unlikes.filter(user => user.toString() !== userId);
                }
                comment.likes.push(userId);
            }
        } else if (reaction === 'unlike') {
            if (unlikeReaction) {
                comment.unlikes = comment.unlikes.filter(user => user.toString() !== userId);
            } else {
                if (likeReaction) {
                    comment.likes = comment.likes.filter(user => user.toString() !== userId);
                }
                comment.unlikes.push(userId);
            }
        }

        await comment.save();

        res.status(200).json({ message: 'Reaction processed successfully', comment });
    } catch (err) {
        console.error('error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});